import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Keep the payload intentionally small because this endpoint is polled
    // frequently by the dashboard and should not pull whole job/task trees.
    const { data: jobs, error } = await supabase
      .from('generation_jobs')
      .select('id, status, total_cards, created_at')
      .eq('user_id', userId)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching active jobs:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch active jobs' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jobIds = (jobs || []).map((job: any) => job.id);

    let tasksByJob = new Map<string, number>();
    if (jobIds.length > 0) {
      const { data: completedTasks, error: tasksError } = await supabase
        .from('generation_tasks')
        .select('job_id')
        .in('job_id', jobIds)
        .eq('status', 'completed');

      if (tasksError) {
        console.error('Error fetching completed task counts:', tasksError);
        return new Response(JSON.stringify({ error: 'Failed to fetch active jobs' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      for (const task of completedTasks || []) {
        const current = tasksByJob.get(task.job_id) || 0;
        tasksByJob.set(task.job_id, current + 1);
      }
    }

    const normalizedJobs = (jobs || []).map((job: any) => ({
      id: job.id,
      status: job.status,
      total_cards: job.total_cards || 0,
      created_at: job.created_at,
      completed_cards: tasksByJob.get(job.id) || 0,
    }));

    return new Response(JSON.stringify({ 
      success: true,
      jobs: normalizedJobs
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in get-active-jobs function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to get active jobs' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
