import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  const MAX_CONCURRENT_TASKS = 2;
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 5000;
  const MAX_PROCESSING_TIME = 30 * 60 * 1000; // 30 minutes

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

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('generation_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error('Job not found');
    }

    // Mark job as processing
    await supabase
      .from('generation_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    // Start background processing
    processTasks(supabase, jobId, job).catch(error => {
      console.error('Background processing error:', error);
    });

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

async function processTasks(supabase: any, jobId: string, job: any) {
  const startTime = Date.now();
  const MAX_CONCURRENT_TASKS = 2;
  const MAX_PROCESSING_TIME = 30 * 60 * 1000;

  const isTaskReady = (task: any) => {
    if (task.status !== 'retrying') return true;
    const retryAfterMs = Number(task.retry_after || 0);
    if (!Number.isFinite(retryAfterMs) || retryAfterMs <= 0) return true;

    const baseTs = new Date(task.updated_at || task.created_at || Date.now()).getTime();
    const nextRetryAt = baseTs + retryAfterMs;
    return Date.now() >= nextRetryAt;
  };

  try {
    while (Date.now() - startTime < MAX_PROCESSING_TIME) {
      // Fetch pending/retrying tasks (include updated_at/retry_after for scheduling)
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
          .select('status')
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

          // Notify user about success
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
              status: 'failed',
              error_message: `Не удалось сгенерировать ${failedCount} из ${allTasks?.length || 0} карточек`,
            })
            .eq('id', jobId);

          const notifyMessage = completedCount > 0
            ? `Частично завершено: ${completedCount} из ${allTasks?.length || 0} карточек для "${job.product_name}". Токены за неудачные карточки возвращены.`
            : `Не удалось сгенерировать карточки для "${job.product_name}". Сервис временно перегружен. Токены возвращены на баланс.`;

          await supabase.from('notifications').insert({
            user_id: job.user_id,
            type: 'error',
            title: completedCount > 0 ? 'Генерация частично завершена' : 'Ошибка генерации',
            message: notifyMessage
          });

          console.log(`Job ${jobId} failed with ${failedCount} failed tasks`);
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      // Only process tasks that are ready (respect retry_after)
      const readyTasks = tasks.filter(isTaskReady).slice(0, MAX_CONCURRENT_TASKS);

      if (readyTasks.length === 0) {
        // No tasks ready yet -> wait until the soonest retry becomes available
        const retrying = tasks.filter((t: any) => t.status === 'retrying' && t.retry_after);
        if (retrying.length === 0) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }

        const now = Date.now();
        const nextWaitMs = Math.max(
          1000,
          Math.min(
            20000,
            ...retrying.map((t: any) => {
              const baseTs = new Date(t.updated_at || t.created_at || now).getTime();
              const nextRetryAt = baseTs + Number(t.retry_after || 0);
              return Math.max(0, nextRetryAt - now);
            })
          )
        );

        console.log(`No tasks ready; waiting ${nextWaitMs}ms for next retry window`);
        await new Promise(resolve => setTimeout(resolve, nextWaitMs));
        continue;
      }

      // Process tasks concurrently
      await Promise.all(readyTasks.map(task => processTask(supabase, task, job)));

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Check for timeout
    if (Date.now() - startTime >= MAX_PROCESSING_TIME) {
      await supabase
        .from('generation_jobs')
        .update({
          status: 'failed',
          error_message: 'Превышено время ожидания генерации',
        })
        .eq('id', jobId);

      // Notify user
      await supabase.from('notifications').insert({
        user_id: job.user_id,
        type: 'error',
        title: 'Время генерации истекло',
        message: `Генерация карточек для "${job.product_name}" заняла слишком много времени. Попробуйте снова позже.`
      });

      console.error(`Job ${jobId} timed out`);
    }

  } catch (error) {
    console.error('Error in processTasks:', error);
    await supabase
      .from('generation_jobs')
      .update({
        status: 'failed',
        error_message: error.message,
      })
      .eq('id', jobId);
  }
}

async function processTask(supabase: any, task: any, job: any) {
  const MAX_RETRIES = 3;

  try {
    // Mark as processing
    await supabase
      .from('generation_tasks')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
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

  } catch (error) {
    console.error(`Error processing task ${task.id}:`, error);

    const retryCount = task.retry_count || 0;
    const errorMessage = error.message || 'Unknown error';
    
    // Check if it's a 503 model overloaded error
    const isModelOverloaded = errorMessage.includes('503') || 
                               errorMessage.includes('overloaded') ||
                               errorMessage.includes('UNAVAILABLE');
    
    if (retryCount < MAX_RETRIES) {
      // Longer delays for overloaded model
      const baseDelay = isModelOverloaded ? 20000 : 10000; // 20s or 10s base
      const retryDelay = Math.pow(2, retryCount) * baseDelay;
      
      console.log(`Task ${task.id} will retry in ${retryDelay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      
      await supabase
        .from('generation_tasks')
        .update({
          status: 'retrying',
          retry_count: retryCount + 1,
          retry_after: retryDelay,
          last_error: isModelOverloaded ? 'Сервис временно перегружен, повторяем...' : errorMessage,
        })
        .eq('id', task.id);

      // Do not wait here (avoid long-running edge function). Scheduler in processTasks respects retry_after.
      return;
    } else {
      const finalError = isModelOverloaded 
        ? 'Сервис временно перегружен. Попробуйте через несколько минут.'
        : errorMessage;
        
      await supabase
        .from('generation_tasks')
        .update({
          status: 'failed',
          last_error: finalError,
        })
        .eq('id', task.id);

      // Refund tokens for failed task
      const tokensToRefund = 1; // 1 token per card
      console.log(`Refunding ${tokensToRefund} tokens to user ${job.user_id} for failed task ${task.id}`);
      await supabase.rpc('refund_tokens', {
        user_id_param: job.user_id,
        tokens_amount: tokensToRefund,
        reason_text: `Возврат за неудачную генерацию: ${finalError}`
      });

      // Notification will be sent when job completes/fails (in processTasks)
    }
  }
}