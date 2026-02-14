import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Calculate tokens to refund per card based on job cost
function calcRefundTokensPerCard(job: any): number {
  const tokensCost = Number(job?.tokens_cost ?? 1);
  const totalCards = Number(job?.total_cards ?? 1);
  if (!Number.isFinite(tokensCost) || tokensCost <= 0) return 1;
  if (!Number.isFinite(totalCards) || totalCards <= 0) return Math.max(1, Math.round(tokensCost));
  return Math.max(1, Math.round(tokensCost / totalCards));
}

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
    // Find stale jobs - check both started_at AND created_at (for jobs that never got started_at)
    // Using raw SQL via rpc would be cleaner, but we'll use multiple queries for safety
    const { data: staleJobsByStarted, error: jobsError1 } = await supabase
      .from('generation_jobs')
      .select('id, user_id, product_name, tokens_cost, total_cards, started_at, created_at')
      .eq('status', 'processing')
      .lt('started_at', staleThreshold);

    if (jobsError1) {
      console.error('[cleanup-stale-jobs] Error fetching stale jobs by started_at:', jobsError1);
    }

    // Also find jobs where started_at is NULL but created_at is old (orphaned jobs)
    const { data: staleJobsByCreated, error: jobsError2 } = await supabase
      .from('generation_jobs')
      .select('id, user_id, product_name, tokens_cost, total_cards, started_at, created_at')
      .eq('status', 'processing')
      .is('started_at', null)
      .lt('created_at', staleThreshold);

    if (jobsError2) {
      console.error('[cleanup-stale-jobs] Error fetching stale jobs by created_at:', jobsError2);
    }

    // Combine and deduplicate
    const staleJobsMap = new Map();
    for (const job of (staleJobsByStarted || [])) {
      staleJobsMap.set(job.id, job);
    }
    for (const job of (staleJobsByCreated || [])) {
      staleJobsMap.set(job.id, job);
    }
    const staleJobs = Array.from(staleJobsMap.values());

    if (staleJobs.length === 0) {
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

          // Calculate proper token refund based on job cost per card
          const tokensPerCard = calcRefundTokensPerCard(job);
          const tokensToRefund = incompleteCount * tokensPerCard;
          
          console.log(`[cleanup-stale-jobs] Refunding ${tokensToRefund} tokens (${incompleteCount} cards × ${tokensPerCard} tokens) to user ${job.user_id}`);
          
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
        const totalCards = (completedCount || 0) + incompleteCount;
        const errorMessage = incompleteCount > 0 
          ? `Не удалось сгенерировать ${incompleteCount} из ${totalCards} карточек (таймаут)`
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
          ? `Генерация "${job.product_name}" частично завершена: ${completedCount} из ${totalCards} карточек. Токены за незавершённые карточки возвращены.`
          : incompleteCount > 0
            ? `Генерация "${job.product_name}" не удалась (таймаут сервиса). Токены возвращены на баланс.`
            : `Генерация "${job.product_name}" завершена.`;

        await supabase.from('notifications').insert({
          user_id: job.user_id,
          type: hasCompleted ? (incompleteCount > 0 ? 'warning' : 'success') : 'error',
          title: hasCompleted ? 'Генерация завершена' : 'Ошибка генерации',
          message: notificationMessage
        });

        totalCleaned++;
        console.log(`[cleanup-stale-jobs] Cleaned job ${job.id}, refunded ${incompleteCount > 0 ? incompleteCount * calcRefundTokensPerCard(job) : 0} tokens`);

      } catch (jobError) {
        console.error(`[cleanup-stale-jobs] Error processing job ${job.id}:`, jobError);
      }
    }

    console.log(`[cleanup-stale-jobs] Card jobs cleanup complete. Cleaned ${totalCleaned} jobs, refunded ${totalTokensRefunded} tokens`);

    // === VIDEO GENERATION JOBS CLEANUP ===
    let videosCleaned = 0;
    let videoTokensRefunded = 0;

    const { data: staleVideoJobs, error: videoJobsError } = await supabase
      .from('video_generation_jobs')
      .select('id, user_id, tokens_cost, prompt, created_at')
      .eq('status', 'processing')
      .lt('created_at', staleThreshold);

    if (videoJobsError) {
      console.error('[cleanup-stale-jobs] Error fetching stale video jobs:', videoJobsError);
    }

    if (staleVideoJobs && staleVideoJobs.length > 0) {
      console.log(`[cleanup-stale-jobs] Found ${staleVideoJobs.length} stale video jobs`);

      for (const vJob of staleVideoJobs) {
        try {
          console.log(`[cleanup-stale-jobs] Processing stale video job ${vJob.id} for user ${vJob.user_id}`);

          await supabase
            .from('video_generation_jobs')
            .update({
              status: 'failed',
              error_message: 'Таймаут генерации видео',
              updated_at: new Date().toISOString(),
            })
            .eq('id', vJob.id);

          const tokensToRefund = Number(vJob.tokens_cost) || 10;
          await supabase.rpc('refund_tokens', {
            user_id_param: vJob.user_id,
            tokens_amount: tokensToRefund,
            reason_text: 'Возврат за незавершённую видеогенерацию (таймаут)',
          });

          await supabase.from('notifications').insert({
            user_id: vJob.user_id,
            type: 'error',
            title: 'Ошибка видеогенерации',
            message: `Генерация видео не завершилась вовремя (таймаут). ${tokensToRefund} токенов возвращены на баланс.`,
          });

          videosCleaned++;
          videoTokensRefunded += tokensToRefund;
          console.log(`[cleanup-stale-jobs] Cleaned video job ${vJob.id}, refunded ${tokensToRefund} tokens`);
        } catch (vJobError) {
          console.error(`[cleanup-stale-jobs] Error processing video job ${vJob.id}:`, vJobError);
        }
      }
    } else {
      console.log('[cleanup-stale-jobs] No stale video jobs found');
    }

    console.log(`[cleanup-stale-jobs] Full cleanup complete. Cards: ${totalCleaned}, Videos: ${videosCleaned}, Total tokens refunded: ${totalTokensRefunded + videoTokensRefunded}`);

    return new Response(
      JSON.stringify({ 
        message: 'Cleanup complete', 
        cleaned: totalCleaned,
        tokensRefunded: totalTokensRefunded,
        videosCleaned,
        videoTokensRefunded,
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
