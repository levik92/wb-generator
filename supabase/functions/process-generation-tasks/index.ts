import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CARD_PROMPTS = {
  cover: (productName: string, category: string, benefits: string) => 
    `Create a professional product card cover image for e-commerce marketplace.

Product: ${productName}
Category: ${category}
Benefits: ${benefits}

Requirements:
- Show the product fully, centered, and clear
- Vertical format 1024x1536 pixels
- High quality, photorealistic commercial style
- Clean background that highlights the product
- Professional lighting
- One optional benefit headline if relevant`,

  lifestyle: (productName: string, category: string, benefits: string) =>
    `Create a lifestyle product shot showing the item in natural use context.

Product: ${productName} 
Category: ${category}
Benefits: ${benefits}

Requirements:
- Vertical format 1024x1536 pixels
- Product as main focus in realistic environment
- Natural lighting and authentic atmosphere
- Shows practical application of the product`,

  macro: (productName: string, category: string, benefits: string) =>
    `Create a macro detail shot emphasizing product quality and craftsmanship.

Product: ${productName}
Category: ${category} 
Benefits: ${benefits}

Requirements:
- Vertical format 1024x1536 pixels
- Close-up showing important details
- Sharp foreground, soft background blur
- Emphasize materials and quality`,

  beforeAfter: (productName: string, category: string, benefits: string) =>
    `Create a before/after comparison showing product benefits.

Product: ${productName}
Category: ${category}
Benefits: ${benefits}

Requirements:
- Vertical format 1024x1536 pixels
- Split composition showing clear contrast
- Minimal text labels "BEFORE" and "AFTER"`,

  bundle: (productName: string, category: string, benefits: string) =>
    `Create a product bundle shot with complementary accessories.

Product: ${productName}
Category: ${category}
Benefits: ${benefits}

Requirements:
- Vertical format 1024x1536 pixels
- Harmonious composition with accessories
- Studio lighting
- Main product prominently featured`,

  guarantee: (productName: string, category: string, benefits: string) =>
    `Create a trust-building product shot emphasizing quality and reliability.

Product: ${productName}
Category: ${category}
Benefits: ${benefits}

Requirements:
- Vertical format 1024x1536 pixels
- Clean background with quality indicators
- Professional presentation
- Trust-building elements`
};

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

    // Process tasks in background
    processTasks(supabase, openAIApiKey, job).catch(error => {
      console.error('Background processing error:', error);
    });

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

    while (true) {
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
        // Check if all tasks are completed
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

        if (!pendingTasks || pendingTasks.length === 0) {
          console.log(`All tasks completed for job ${job.id}`);
          
          // Update job status
          await supabase
            .from('generation_jobs')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', job.id);
          
          break;
        }

        // Wait before checking again
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      console.log(`Processing ${tasks.length} tasks for job ${job.id}`);

      // Process tasks concurrently
      const taskPromises = tasks.map(task => processTask(supabase, openAIApiKey, job, task));
      await Promise.allSettled(taskPromises);
    }

    console.log(`Background processing completed for job ${job.id}`);

  } catch (error) {
    console.error(`Error in background processing for job ${job.id}:`, error);
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

    // Generate prompt
    const promptTemplate = CARD_PROMPTS[task.card_type];
    if (!promptTemplate) {
      throw new Error(`Unknown card type: ${task.card_type}`);
    }

    const prompt = promptTemplate(job.product_name, job.category, job.description);
    
    console.log(`Generated prompt for task ${task.id}: ${prompt.substring(0, 100)}...`);

    // Update task with prompt
    await supabase
      .from('generation_tasks')
      .update({ prompt })
      .eq('id', task.id);

    // Generate image with OpenAI
    console.log(`Calling OpenAI API for task ${task.id}`);
    
    const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1792',
        quality: 'hd'
      }),
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error(`OpenAI API error for task ${task.id}:`, imageResponse.status, errorText);

      // Handle rate limit
      if (imageResponse.status === 429) {
        const retryAfter = parseInt(imageResponse.headers.get('retry-after') || '60');
        const jitter = Math.floor(Math.random() * 10);
        const retryDelay = retryAfter + jitter;

        console.log(`Rate limited for task ${task.id}, retrying after ${retryDelay} seconds`);

        if (task.retry_count < MAX_RETRY_COUNT) {
          await supabase
            .from('generation_tasks')
            .update({ 
              status: 'retrying',
              retry_count: task.retry_count + 1,
              retry_after: Math.floor(Date.now() / 1000) + retryDelay,
              last_error: 'Rate limit exceeded'
            })
            .eq('id', task.id);
          return;
        }
      }

      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const imageData = await imageResponse.json();
    console.log(`OpenAI response for task ${task.id}:`, imageData);

    if (!imageData.data || !imageData.data[0] || !imageData.data[0].url) {
      throw new Error('Invalid OpenAI response - no image URL');
    }

    const imageUrl = imageData.data[0].url;

    // Download and upload to Supabase Storage
    console.log(`Downloading image for task ${task.id} from:`, imageUrl);
    
    const imageBuffer = await fetch(imageUrl).then(r => r.arrayBuffer());
    const fileName = `${job.id}/${task.card_index}_${task.card_type}.png`;
    
    console.log(`Uploading to storage: ${fileName}`);
    
    const { error: uploadError } = await supabase.storage
      .from('generated-cards')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error(`Upload error for task ${task.id}:`, uploadError);
      throw new Error(`Upload error: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('generated-cards')
      .getPublicUrl(fileName);

    console.log(`Public URL for task ${task.id}:`, publicUrl);

    // Mark task as completed
    await supabase
      .from('generation_tasks')
      .update({ 
        status: 'completed',
        image_url: publicUrl,
        storage_path: fileName,
        completed_at: new Date().toISOString()
      })
      .eq('id', task.id);

    console.log(`Task ${task.id} completed successfully`);

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