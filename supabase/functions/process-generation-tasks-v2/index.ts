import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to get prompt from database and replace placeholders
async function getPromptTemplate(supabase: any, promptType: string, productName: string, category: string, benefits: string) {
  const { data: promptData, error: promptError } = await supabase
    .from('ai_prompts')
    .select('prompt_template')
    .eq('prompt_type', promptType)
    .order('created_at', { ascending: false })
    .limit(1);

  if (promptError) {
    throw new Error(`Failed to fetch prompt template for ${promptType}: ${promptError.message}`);
  }

  if (!promptData || promptData.length === 0) {
    throw new Error(`No prompt template found for type: ${promptType}`);
  }

  // Replace placeholders in the prompt template
  let prompt = promptData[0].prompt_template;
  prompt = prompt.replace(/{productName}/g, productName);
  prompt = prompt.replace(/{category}/g, category);
  prompt = prompt.replace(/{benefits}/g, benefits);

  return prompt;
}


const MAX_CONCURRENT_TASKS = 2;
const MAX_RETRY_COUNT = 3;
const RETRY_BASE_DELAY = 60;

serve(async (req) => {
  console.log(`Process generation tasks called: ${req.method}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasOpenAIKey: !!openAIApiKey
    });
    
    if (!supabaseUrl || !supabaseServiceKey || !openAIApiKey) {
      const missing = [];
      if (!supabaseUrl) missing.push('SUPABASE_URL');
      if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
      if (!openAIApiKey) missing.push('OPENAI_API_KEY');
      
      console.error('Missing environment variables:', missing);
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestBody = await req.json();
    const { jobId } = requestBody;
    
    console.log('Processing job:', jobId);

    if (!jobId) {
      return new Response(JSON.stringify({ error: 'jobId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('generation_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error('Job not found:', jobError);
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Job found:', job.id, 'status:', job.status);

    // Mark job as processing
    await supabase
      .from('generation_jobs')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', jobId);

    // Process tasks in background with proper task handling
    const backgroundProcessing = processTasks(supabase, openAIApiKey, job);
    
    // Use EdgeRuntime.waitUntil to prevent early drop
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(backgroundProcessing);
    } else {
      backgroundProcessing.catch(error => {
        console.error('Background processing error:', error);
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Background processing started'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in process-generation-tasks function:', error);
    
    return new Response(JSON.stringify({
      error: error.message || 'Processing error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processTasks(supabase: any, openAIApiKey: string, job: any) {
  try {
    console.log(`Starting background processing for job ${job.id}`);
    
    const maxProcessingTime = 30 * 60 * 1000; // 30 minutes maximum
    const startTime = Date.now();

    while (Date.now() - startTime < maxProcessingTime) {
      // Get ready tasks
      const now = Math.floor(Date.now() / 1000);
      const { data: tasks, error: tasksError } = await supabase
        .from('generation_tasks')
        .select('*')
        .eq('job_id', job.id)
        .in('status', ['pending', 'retrying'])
        .or(`retry_after.is.null,retry_after.lt.${now}`)
        .order('created_at')
        .limit(MAX_CONCURRENT_TASKS);

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        break;
      }

      if (!tasks || tasks.length === 0) {
        // Check if all tasks are completed or failed
        const { data: allTasks, error: allTasksError } = await supabase
          .from('generation_tasks')
          .select('status')
          .eq('job_id', job.id);

        if (allTasksError) {
          console.error('Error checking all tasks:', allTasksError);
          break;
        }

        const pendingTasks = allTasks?.filter(t => 
          t.status === 'pending' || t.status === 'processing' || t.status === 'retrying'
        );
        
        const completedTasks = allTasks?.filter(t => t.status === 'completed');
        const failedTasks = allTasks?.filter(t => t.status === 'failed');

        if (!pendingTasks || pendingTasks.length === 0) {
          console.log(`All tasks completed for job ${job.id}`);
          
          // Check if job is already completed to avoid duplicate notifications
          if (job.status === 'completed' || job.status === 'failed') {
            console.log(`Job ${job.id} already completed, skipping notification`);
            break;
          }
          
          // Determine final job status
          const finalStatus = failedTasks && failedTasks.length > 0 && completedTasks && completedTasks.length === 0 ? 'failed' : 'completed';
          
          // Update job status
          await supabase
            .from('generation_jobs')
            .update({ 
              status: finalStatus,
              completed_at: new Date().toISOString(),
              error_message: finalStatus === 'failed' ? 'Some tasks failed' : null
            })
            .eq('id', job.id);
          
          // Send completion notification
          await supabase
            .from('notifications')
            .insert({
              user_id: job.user_id,
              title: finalStatus === 'completed' ? 'Генерация завершена' : 'Генерация завершена с ошибками',
              message: finalStatus === 'completed' 
                ? `Генерация "${job.product_name}" успешно завершена. Все карточки готовы.`
                : `Генерация "${job.product_name}" завершена. Некоторые карточки могли не сгенерироваться.`,
              type: finalStatus === 'completed' ? 'success' : 'warning'
            });
          
          break;
        }

        // Wait before checking again (but not too long to prevent timeout)
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue;
      }

      console.log(`Processing ${tasks.length} tasks for job ${job.id}`);

      // Process tasks concurrently
      const taskPromises = tasks.map(task => processTask(supabase, openAIApiKey, job, task));
      await Promise.allSettled(taskPromises);
      
      // Small delay between batches to prevent overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Check if we hit the time limit
    if (Date.now() - startTime >= maxProcessingTime) {
      console.error(`Processing timeout for job ${job.id}`);
      await supabase
        .from('generation_jobs')
        .update({ 
          status: 'failed',
          error_message: 'Processing timeout',
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id);
    }

    console.log(`Background processing completed for job ${job.id}`);

  } catch (error) {
    console.error(`Error in background processing for job ${job.id}:`, error);
    
    // Mark job as failed
    await supabase
      .from('generation_jobs')
      .update({ 
        status: 'failed',
        error_message: error.message || 'Unknown processing error',
        completed_at: new Date().toISOString()
      })
      .eq('id', job.id);
  }
}

async function processTask(supabase: any, openAIApiKey: string, job: any, task: any) {
  try {
    console.log(`Processing task ${task.id} (${task.card_type})`);

    // Mark task as processing
    await supabase
      .from('generation_tasks')
      .update({ 
        status: 'processing', 
        started_at: new Date().toISOString() 
      })
      .eq('id', task.id);

    // Generate prompt from database
    const prompt = await getPromptTemplate(supabase, task.card_type, job.product_name, job.category, job.description);
    
    console.log(`Generated prompt for task ${task.id}: ${prompt.substring(0, 100)}...`);

    // Update task with prompt
    await supabase
      .from('generation_tasks')
      .update({ prompt })
      .eq('id', task.id);

    // Get the uploaded image from job
    if (!job.product_images || !Array.isArray(job.product_images) || job.product_images.length === 0) {
      throw new Error('No product images provided for editing');
    }
    
    const firstImage = job.product_images[0];
    
    // Handle different possible structures
    let sourceImageUrl;
    if (typeof firstImage === 'string') {
      sourceImageUrl = firstImage;
    } else if (firstImage && typeof firstImage === 'object') {
      // Try common properties for image URLs
      sourceImageUrl = firstImage.url || firstImage.src || firstImage.publicUrl || firstImage.signedUrl;
    }
    
    if (!sourceImageUrl || typeof sourceImageUrl !== 'string') {
      throw new Error(`Cannot extract URL from image object: ${JSON.stringify(firstImage)}`);
    }

    console.log(`Using source image URL for task ${task.id}: ${sourceImageUrl}`);
    
    // Delegate to separate async function instead of processing here
    console.log(`Delegating OpenAI processing for task ${task.id}`);
    
    const openaiTask = async () => {
      try {
        await supabase.functions.invoke('process-openai-task', {
          body: {
            taskId: task.id,
            sourceImageUrl: sourceImageUrl,
            prompt: prompt
          }
        });
        console.log(`Successfully delegated task ${task.id} to OpenAI processing`);
      } catch (error) {
        console.error(`Failed to invoke process-openai-task for ${task.id}:`, error);
        // Mark task as failed if delegation fails
        await supabase
          .from('generation_tasks')
          .update({ 
            status: 'failed',
            last_error: `Failed to delegate to OpenAI processor: ${error.message}`,
            completed_at: new Date().toISOString()
          })
          .eq('id', task.id);
      }
    };
    
    // Use background task handling
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(openaiTask());
    } else {
      openaiTask();
    }

    console.log(`Task ${task.id} delegated to async processing`);
    return; // Exit early

  } catch (error: any) {
    console.error(`Task ${task.id} error:`, error);

    // Mark task as failed if max retries exceeded
    if (task.retry_count >= MAX_RETRY_COUNT) {
      await supabase
        .from('generation_tasks')
        .update({ 
          status: 'failed',
          last_error: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', task.id);
    } else {
      // Retry with exponential backoff
      const retryDelay = RETRY_BASE_DELAY * Math.pow(2, task.retry_count);
      await supabase
        .from('generation_tasks')
        .update({ 
          status: 'retrying',
          retry_count: task.retry_count + 1,
          retry_after: Math.floor(Date.now() / 1000) + retryDelay,
          last_error: error.message
        })
        .eq('id', task.id);
    }
  }
}