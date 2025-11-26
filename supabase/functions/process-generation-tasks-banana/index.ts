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

  try {
    while (Date.now() - startTime < MAX_PROCESSING_TIME) {
      // Get pending/retrying tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('generation_tasks')
        .select('*')
        .eq('job_id', jobId)
        .in('status', ['pending', 'retrying'])
        .order('card_index')
        .limit(MAX_CONCURRENT_TASKS);

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
          console.log(`Job ${jobId} completed successfully`);
          break;
        } else if (allDone) {
          await supabase
            .from('generation_jobs')
            .update({
              status: 'failed',
              error_message: 'Some tasks failed to complete',
            })
            .eq('id', jobId);
          console.log(`Job ${jobId} failed`);
          break;
        }

        // Wait before checking again
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      // Process tasks concurrently
      await Promise.all(tasks.map(task => processTask(supabase, task, job)));

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Check for timeout
    if (Date.now() - startTime >= MAX_PROCESSING_TIME) {
      await supabase
        .from('generation_jobs')
        .update({
          status: 'failed',
          error_message: 'Processing timeout exceeded',
        })
        .eq('id', jobId);
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
    
    if (retryCount < MAX_RETRIES) {
      const retryDelay = Math.pow(2, retryCount) * 5000;
      await supabase
        .from('generation_tasks')
        .update({
          status: 'retrying',
          retry_count: retryCount + 1,
          retry_after: retryDelay,
          last_error: error.message,
        })
        .eq('id', task.id);

      await new Promise(resolve => setTimeout(resolve, retryDelay));
    } else {
      await supabase
        .from('generation_tasks')
        .update({
          status: 'failed',
          last_error: error.message,
        })
        .eq('id', task.id);
    }
  }
}