import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey || !openAIApiKey) {
      const missing = [];
      if (!supabaseUrl) missing.push('SUPABASE_URL');
      if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
      if (!openAIApiKey) missing.push('OPENAI_API_KEY');
      
      console.error('Missing environment variables:', missing);
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { taskId, sourceImageUrl, prompt } = await req.json();
    console.log(`Processing OpenAI task ${taskId}`);
    
    // Get task and job info for proper file path
    const { data: taskData, error: taskError } = await supabase
      .from('generation_tasks')
      .select(`
        *,
        generation_jobs!inner(
          id,
          user_id
        )
      `)
      .eq('id', taskId)
      .single();
    
    if (taskError || !taskData) {
      throw new Error(`Task not found: ${taskError?.message || 'Unknown error'}`);
    }
    // Download source image
    const sourceImageResponse = await fetch(sourceImageUrl);
    if (!sourceImageResponse.ok) {
      throw new Error(`Failed to download source image: ${sourceImageResponse.statusText}`);
    }
    const sourceImageBuffer = await sourceImageResponse.arrayBuffer();
    const sourceImageBlob = new Blob([
      sourceImageBuffer
    ], {
      type: 'image/png'
    });
    // Call OpenAI
    const formData = new FormData();
    formData.append('image', sourceImageBlob, 'source.png');
    formData.append('quality', 'low');
    formData.append('model', 'gpt-image-1');
    formData.append('prompt', prompt);
    formData.append('n', '1');
    formData.append('size', '1024x1536');
    console.log(`Calling OpenAI for task ${taskId}`);
    const imageResponse = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`
      },
      body: formData
    });
    console.log(`OpenAI HTTP status for task ${taskId}: ${imageResponse.status}`);
    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error(`OpenAI error for task ${taskId}:`, errorText);
      
      // Handle rate limiting with retry logic
      if (imageResponse.status === 429) {
        const retryAfter = parseInt(imageResponse.headers.get('retry-after') || '60');
        await supabase.from('generation_tasks').update({
          status: 'retrying',
          retry_count: (await supabase.from('generation_tasks').select('retry_count').eq('id', taskId).single()).data?.retry_count + 1 || 1,
          retry_after: Math.floor(Date.now() / 1000) + retryAfter,
          last_error: 'Rate limit exceeded'
        }).eq('id', taskId);
      } else {
        // Mark task as failed for other errors
        await supabase.from('generation_tasks').update({
          status: 'failed',
          last_error: `OpenAI error: ${errorText}`,
          completed_at: new Date().toISOString()
        }).eq('id', taskId);
      }
      
      return new Response(JSON.stringify({
        error: errorText
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const imageData = await imageResponse.json();
    console.log(`OpenAI response for task ${taskId}:`, JSON.stringify(imageData, null, 2));
    if (!imageData.data || !imageData.data[0]) {
      console.error(`Invalid OpenAI response structure:`, imageData);
      throw new Error(`Invalid OpenAI response: ${JSON.stringify(imageData)}`);
    }
    const imageResult = imageData.data[0];
    let imageBuffer;
    // Handle different response formats
    if (imageResult.b64_json) {
      // gpt-image-1 returns base64 encoded image
      console.log(`Processing base64 image for task ${taskId}`);
      imageBuffer = Uint8Array.from(atob(imageResult.b64_json), (c)=>c.charCodeAt(0));
    } else if (imageResult.url) {
      // DALL-E-2/3 returns URL
      console.log(`Downloading image from URL for task ${taskId}`);
      imageBuffer = await fetch(imageResult.url).then((r)=>r.arrayBuffer());
    } else {
      throw new Error(`No image data found in response: ${JSON.stringify(imageResult)}`);
    }
    const fileName = `${taskData.generation_jobs.user_id}/${taskData.generation_jobs.id}/${taskData.card_index}_${taskData.card_type}.png`;
    const { error: uploadError } = await supabase.storage.from('generated-cards').upload(fileName, imageBuffer, {
      contentType: 'image/png',
      upsert: true
    });
    if (uploadError) {
      throw new Error(`Upload error: ${uploadError.message}`);
    }
    // Get public URL
    const { data: { publicUrl } } = supabase.storage.from('generated-cards').getPublicUrl(fileName);
    // Mark task as completed
    await supabase.from('generation_tasks').update({
      status: 'completed',
      image_url: publicUrl,
      storage_path: fileName,
      completed_at: new Date().toISOString()
    }).eq('id', taskId);
    console.log(`Task ${taskId} completed successfully`);
    return new Response(JSON.stringify({
      success: true,
      imageUrl: publicUrl
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error processing OpenAI task:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Processing error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
