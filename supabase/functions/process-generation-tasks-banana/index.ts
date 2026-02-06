import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function calcRefundTokensPerCard(job: any): number {
  const tokensCost = Number(job?.tokens_cost ?? 1);
  const totalCards = Number(job?.total_cards ?? 1);
  if (!Number.isFinite(tokensCost) || tokensCost <= 0) return 1;
  if (!Number.isFinite(totalCards) || totalCards <= 0) return Math.max(1, Math.round(tokensCost));
  return Math.max(1, Math.round(tokensCost / totalCards));
}

function waitUntil(promise: Promise<unknown>) {
  try {
    // Supabase Edge Runtime supports EdgeRuntime.waitUntil for background work
    (globalThis as any).EdgeRuntime?.waitUntil?.(promise);
  } catch (_) {
    // ignore
  }
}

// Helper function to get prompt template
async function getPromptTemplate(
  supabase: any,
  promptType: string,
  productName: string,
  category: string,
  benefits: string
): Promise<string> {
  const { data, error } = await supabase
    .from('ai_prompts')
    .select('prompt_template')
    .eq('prompt_type', promptType)
    .eq('model_type', 'google')
    .single();

  if (error || !data) {
    throw new Error(`Failed to fetch prompt for type: ${promptType}`);
  }

  return data.prompt_template
    .replace('{productName}', productName)
    .replace('{category}', category)
    .replace('{benefits}', benefits);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const MAX_CONCURRENT_TASKS = 1; // Process one task at a time
  const MAX_RETRIES = 3;
  const MAX_PROCESSING_TIME = 5 * 60 * 1000; // 5 minutes timeout (safe margin before Supabase ~6.5min limit)

  try {
    const { jobId } = await req.json();

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'Missing jobId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // IMMEDIATELY mark job as processing with started_at - this ensures cleanup can find it
    // Do this BEFORE fetching job details to minimize the window where job could be orphaned
    const { error: updateError } = await supabase
      .from('generation_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .eq('status', 'pending'); // Only update if still pending (prevents race conditions)

    if (updateError) {
      console.error('Failed to mark job as processing:', updateError);
      // Continue anyway - the job might already be processing from another invocation
    }

    // Get job details (now with started_at set)
    const { data: job, error: jobError } = await supabase
      .from('generation_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error('Job not found');
    }

    // Verify job is in processing state (it should be after our update above)
    if (job.status !== 'processing') {
      console.log(`Job ${jobId} is in state ${job.status}, not processing. Skipping.`);
      return new Response(
        JSON.stringify({ message: 'Job already processed or in unexpected state', status: job.status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Start background processing (keep alive with waitUntil to avoid random aborts)
    const bg = processTasks(supabase, jobId, job, MAX_CONCURRENT_TASKS, MAX_RETRIES, MAX_PROCESSING_TIME)
      .catch((error) => {
        console.error('Background processing error:', error);
      });
    waitUntil(bg);

    return new Response(
      JSON.stringify({ message: 'Processing started in background', jobId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-generation-tasks-banana:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processTasks(
  supabase: any, 
  jobId: string, 
  job: any,
  MAX_CONCURRENT_TASKS: number,
  MAX_RETRIES: number,
  MAX_PROCESSING_TIME: number
) {
  const startTime = Date.now();

  const isTaskReady = (task: any) => {
    if (task.status === 'pending') return true;
    if (task.status !== 'retrying') return false;
    
    const retryAfterMs = Number(task.retry_after || 0);
    if (!Number.isFinite(retryAfterMs) || retryAfterMs <= 0) return true;

    const baseTs = new Date(task.updated_at || task.created_at || Date.now()).getTime();
    const nextRetryAt = baseTs + retryAfterMs;
    return Date.now() >= nextRetryAt;
  };

  try {
    while (Date.now() - startTime < MAX_PROCESSING_TIME) {
      // Fetch pending/retrying tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('generation_tasks')
        .select('*')
        .eq('job_id', jobId)
        .in('status', ['pending', 'retrying'])
        .order('card_index')
        .limit(10);

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        break;
      }

      if (!tasks || tasks.length === 0) {
        // Check if all tasks are completed or failed
        const { data: allTasks } = await supabase
          .from('generation_tasks')
          .select('id, status')
          .eq('job_id', jobId);

        const allCompleted = allTasks?.every(t => t.status === 'completed');
        const allDone = allTasks?.every(t => ['completed', 'failed'].includes(t.status));

        if (allCompleted) {
          await supabase
            .from('generation_jobs')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', jobId);

          await supabase.from('notifications').insert({
            user_id: job.user_id,
            type: 'success',
            title: 'Генерация завершена',
            message: `Карточки для "${job.product_name}" успешно сгенерированы!`
          });

          console.log(`Job ${jobId} completed successfully`);
          break;
        } else if (allDone) {
          const failedCount = allTasks?.filter(t => t.status === 'failed').length || 0;
          const completedCount = allTasks?.filter(t => t.status === 'completed').length || 0;

          await supabase
            .from('generation_jobs')
            .update({
              status: failedCount === allTasks?.length ? 'failed' : 'completed',
              error_message: `Не удалось сгенерировать ${failedCount} из ${allTasks?.length || 0} карточек`,
              completed_at: new Date().toISOString(),
            })
            .eq('id', jobId);

          const notifyMessage = completedCount > 0
            ? `Частично завершено: ${completedCount} из ${allTasks?.length || 0} карточек для "${job.product_name}". Токены за неудачные карточки возвращены.`
            : `Не удалось сгенерировать карточки для "${job.product_name}". Сервис временно перегружен. Токены возвращены на баланс.`;

          await supabase.from('notifications').insert({
            user_id: job.user_id,
            type: completedCount > 0 ? 'warning' : 'error',
            title: completedCount > 0 ? 'Генерация частично завершена' : 'Ошибка генерации',
            message: notifyMessage
          });

          console.log(`Job ${jobId} finished with ${completedCount} completed, ${failedCount} failed`);
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      // Only process tasks that are ready
      const readyTasks = tasks.filter(isTaskReady).slice(0, MAX_CONCURRENT_TASKS);

      if (readyTasks.length === 0) {
        // Calculate wait time until next retry
        const retrying = tasks.filter((t: any) => t.status === 'retrying' && t.retry_after);
        if (retrying.length === 0) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }

        const now = Date.now();
        const waitTimes = retrying.map((t: any) => {
          const baseTs = new Date(t.updated_at || t.created_at || now).getTime();
          const nextRetryAt = baseTs + Number(t.retry_after || 0);
          return Math.max(0, nextRetryAt - now);
        });
        
        const nextWaitMs = Math.min(30000, Math.max(1000, Math.min(...waitTimes)));

        console.log(`No tasks ready; waiting ${nextWaitMs}ms for next retry window`);
        await new Promise(resolve => setTimeout(resolve, nextWaitMs));
        continue;
      }

      // Process tasks one by one (to avoid overloading the API)
      for (const task of readyTasks) {
        await processTask(supabase, task, job, MAX_RETRIES);
        // Delay between tasks to prevent API overload
        await new Promise(resolve => setTimeout(resolve, 6000));
      }
    }

    // Handle timeout - refund all incomplete tasks
    if (Date.now() - startTime >= MAX_PROCESSING_TIME) {
      console.error(`Job ${jobId} timed out after ${MAX_PROCESSING_TIME}ms`);
      
      // Get all incomplete tasks
      const { data: incompleteTasks } = await supabase
        .from('generation_tasks')
        .select('id')
        .eq('job_id', jobId)
        .not('status', 'in', '("completed","failed")');
      
      if (incompleteTasks && incompleteTasks.length > 0) {
        // Mark all incomplete tasks as failed
        await supabase
          .from('generation_tasks')
          .update({
            status: 'failed',
            last_error: 'timeout_exceeded',
            updated_at: new Date().toISOString(),
          })
          .eq('job_id', jobId)
          .not('status', 'in', '("completed","failed")');
        
        // Refund tokens for timed out tasks
        const tokensToRefund = incompleteTasks.length * calcRefundTokensPerCard(job);
        console.log(`Refunding ${tokensToRefund} tokens for ${incompleteTasks.length} timed out tasks`);
        await supabase.rpc('refund_tokens', {
          user_id_param: job.user_id,
          tokens_amount: tokensToRefund,
          reason_text: 'Возврат за задачи, не завершённые вовремя'
        });
      }
      
      await supabase
        .from('generation_jobs')
        .update({
          status: 'failed',
          error_message: 'Превышено время ожидания генерации',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      await supabase.from('notifications').insert({
        user_id: job.user_id,
        type: 'error',
        title: 'Время генерации истекло',
        message: `Генерация карточек для "${job.product_name}" заняла слишком много времени. Токены возвращены на баланс.`
      });
    }

  } catch (error) {
    console.error('Error in processTasks:', error);
    await supabase
      .from('generation_jobs')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }
}

async function processTask(supabase: any, task: any, job: any, MAX_RETRIES: number) {
  try {
    // Mark as processing
    await supabase
      .from('generation_tasks')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', task.id);

    // Get prompt for this card type
    const prompt = await getPromptTemplate(
      supabase,
      task.card_type,
      job.product_name,
      job.category,
      job.description
    );

    // Get source image URL
    const sourceImageUrl = job.product_images?.[0]?.url;
    if (!sourceImageUrl) {
      throw new Error('No source image available');
    }

    // Call Google task processor
    const { error: processError } = await supabase.functions.invoke('process-google-task', {
      body: {
        taskId: task.id,
        sourceImageUrl: sourceImageUrl,
        prompt: prompt,
      },
    });

    if (processError) {
      throw processError;
    }

    // After invoke, read actual task status from DB
    const { data: updatedTask } = await supabase
      .from('generation_tasks')
      .select('status, retry_count, last_error')
      .eq('id', task.id)
      .single();
    
    if (updatedTask) {
      console.log(`Task ${task.id} status after process-google-task: ${updatedTask.status}, retry_count: ${updatedTask.retry_count}`);
    }

  } catch (error) {
    console.error(`Error processing task ${task.id}:`, error);

    // Read current task state from DB (to get accurate status and retry_count)
    const { data: currentTask } = await supabase
      .from('generation_tasks')
      .select('status, retry_count, last_error')
      .eq('id', task.id)
      .single();
    
    const actualRetryCount = currentTask?.retry_count || task.retry_count || 0;
    const currentStatus = currentTask?.status;
    const currentLastError = currentTask?.last_error || '';
    
    // If task is already in final state (completed or failed), skip - process-google-task already handled it
    if (currentStatus === 'completed' || currentStatus === 'failed') {
      console.log(`Task ${task.id} already in final state: ${currentStatus} (handled by process-google-task)`);
      return;
    }
    
    // If task is already scheduled for retry, skip
    if (currentStatus === 'retrying' && actualRetryCount > (task.retry_count || 0)) {
      console.log(`Task ${task.id} already scheduled for retry (count: ${actualRetryCount})`);
      return;
    }

    const errorMessage = error.message || 'Unknown error';
    
    // Check if it's a model overloaded error or edge function error
    const isModelOverloaded = errorMessage.includes('503') || 
                               errorMessage.includes('overloaded') ||
                               errorMessage.includes('UNAVAILABLE') ||
                               errorMessage.includes('google_503');
    
    const isEdgeFunctionError = errorMessage.includes('Edge Function') || 
                                 errorMessage.includes('non-2xx');
    
    if (actualRetryCount < MAX_RETRIES) {
      // Retry delays: 10s, 20s, 25s
      const RETRY_DELAYS = [10000, 20000, 25000];
      const retryDelay = RETRY_DELAYS[actualRetryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      
      console.log(`Task ${task.id} will retry in ${retryDelay}ms (attempt ${actualRetryCount + 1}/${MAX_RETRIES})`);
      
      await supabase
        .from('generation_tasks')
        .update({
          status: 'retrying',
          retry_count: actualRetryCount + 1,
          retry_after: retryDelay,
          last_error: isModelOverloaded ? 'google_503_overloaded' : (isEdgeFunctionError ? 'edge_function_error' : errorMessage),
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id);

    } else {
      const finalError = isModelOverloaded 
        ? 'Сервис временно перегружен. Попробуйте через несколько минут.'
        : (isEdgeFunctionError ? 'Ошибка при обработке задачи.' : errorMessage);
      
      // Check if task was already marked as failed (to avoid double refund)
      const { data: taskBeforeUpdate } = await supabase
        .from('generation_tasks')
        .select('status')
        .eq('id', task.id)
        .single();
      
      if (taskBeforeUpdate?.status === 'failed') {
        console.log(`Task ${task.id} was already marked as failed, skipping duplicate processing`);
        return;
      }
        
      await supabase
        .from('generation_tasks')
        .update({
          status: 'failed',
          last_error: finalError,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      // Refund tokens for failed task (only if we're the ones marking it as failed)
      const tokensToRefund = calcRefundTokensPerCard(job);
      console.log(`Refunding ${tokensToRefund} tokens to user ${job.user_id} for failed task ${task.id}`);
      await supabase.rpc('refund_tokens', {
        user_id_param: job.user_id,
        tokens_amount: tokensToRefund,
        reason_text: `Возврат за неудачную генерацию: ${finalError}`
      });
      
      // Send notification
      await supabase.from('notifications').insert({
        user_id: job.user_id,
        type: 'error',
        title: 'Ошибка генерации',
        message: `Не удалось сгенерировать карточку "${job.product_name}". ${finalError} Токены возвращены на баланс.`
      });
    }
  }
}
