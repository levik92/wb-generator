import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cleanup stale generation jobs that are stuck in 'processing' status
// This function should be called periodically via pg_cron (every 5 minutes)
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Jobs older than 10 minutes in 'processing' status are considered stale
  const STALE_THRESHOLD_MINUTES = 10;
  const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000).toISOString();

  console.log(`[cleanup-stale-jobs] Starting cleanup, threshold: ${staleThreshold}`);

  try {
    // Find stale jobs
    const { data: staleJobs, error: jobsError } = await supabase
      .from('generation_jobs')
      .select('id, user_id, product_name, tokens_cost, started_at')
      .eq('status', 'processing')
      .lt('started_at', staleThreshold);

    if (jobsError) {
      console.error('[cleanup-stale-jobs] Error fetching stale jobs:', jobsError);
      throw jobsError;
    }

    if (!staleJobs || staleJobs.length === 0) {
      console.log('[cleanup-stale-jobs] No stale jobs found');
      return new Response(
        JSON.stringify({ message: 'No stale jobs found', cleaned: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[cleanup-stale-jobs] Found ${staleJobs.length} stale jobs`);

    let totalCleaned = 0;
    let totalTokensRefunded = 0;

    for (const job of staleJobs) {
      try {
        console.log(`[cleanup-stale-jobs] Processing stale job ${job.id} for user ${job.user_id}`);

        // Get incomplete tasks for this job
        const { data: incompleteTasks, error: tasksError } = await supabase
          .from('generation_tasks')
          .select('id, status')
          .eq('job_id', job.id)
          .not('status', 'in', '("completed","failed")');

        if (tasksError) {
          console.error(`[cleanup-stale-jobs] Error fetching tasks for job ${job.id}:`, tasksError);
          continue;
        }

        const incompleteCount = incompleteTasks?.length || 0;
        
        // Get completed tasks count
        const { count: completedCount } = await supabase
          .from('generation_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('job_id', job.id)
          .eq('status', 'completed');

        // Mark incomplete tasks as failed
        if (incompleteCount > 0) {
          await supabase
            .from('generation_tasks')
            .update({
              status: 'failed',
              last_error: 'timeout_cleanup',
              updated_at: new Date().toISOString(),
            })
            .eq('job_id', job.id)
            .not('status', 'in', '("completed","failed")');

          // Refund tokens for incomplete tasks
          const tokensToRefund = incompleteCount;
          console.log(`[cleanup-stale-jobs] Refunding ${tokensToRefund} tokens to user ${job.user_id}`);
          
          await supabase.rpc('refund_tokens', {
            user_id_param: job.user_id,
            tokens_amount: tokensToRefund,
            reason_text: 'Возврат за незавершённые карточки (таймаут генерации)'
          });

          totalTokensRefunded += tokensToRefund;
        }

        // Determine final job status
        const hasCompleted = (completedCount || 0) > 0;
        const finalStatus = hasCompleted ? 'completed' : 'failed';
        const errorMessage = incompleteCount > 0 
          ? `Не удалось сгенерировать ${incompleteCount} из ${(completedCount || 0) + incompleteCount} карточек (таймаут)`
          : null;

        // Update job status
        await supabase
          .from('generation_jobs')
          .update({
            status: finalStatus,
            error_message: errorMessage,
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        // Send notification to user
        const notificationMessage = hasCompleted && incompleteCount > 0
          ? `Генерация "${job.product_name}" частично завершена: ${completedCount} из ${(completedCount || 0) + incompleteCount} карточек. Токены за незавершённые карточки возвращены.`
          : incompleteCount > 0
            ? `Генерация "${job.product_name}" не удалась (таймаут сервиса). ${incompleteCount} токенов возвращено на баланс.`
            : `Генерация "${job.product_name}" завершена.`;

        await supabase.from('notifications').insert({
          user_id: job.user_id,
          type: hasCompleted ? (incompleteCount > 0 ? 'warning' : 'success') : 'error',
          title: hasCompleted ? 'Генерация завершена' : 'Ошибка генерации',
          message: notificationMessage
        });

        totalCleaned++;
        console.log(`[cleanup-stale-jobs] Cleaned job ${job.id}, refunded ${incompleteCount} tokens`);

      } catch (jobError) {
        console.error(`[cleanup-stale-jobs] Error processing job ${job.id}:`, jobError);
      }
    }

    console.log(`[cleanup-stale-jobs] Cleanup complete. Cleaned ${totalCleaned} jobs, refunded ${totalTokensRefunded} tokens`);

    return new Response(
      JSON.stringify({ 
        message: 'Cleanup complete', 
        cleaned: totalCleaned,
        tokensRefunded: totalTokensRefunded
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[cleanup-stale-jobs] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
