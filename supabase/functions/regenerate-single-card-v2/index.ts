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


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey || !openAIApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestBody = await req.json();
    const {
      productName,
      category = '',
      description,
      userId,
      cardIndex,
      cardType,
      sourceImageUrl,
      productImages,
    } = requestBody;

    // Input validation
    if (!productName || typeof productName !== 'string' || productName.length > 100) {
      return new Response(JSON.stringify({ error: 'Invalid product name' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!description || typeof description !== 'string' || description.length > 2000) {
      return new Response(JSON.stringify({ error: 'Invalid description' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!userId || typeof userId !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid user ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (typeof cardIndex !== 'number' || cardIndex < 0 || cardIndex > 10) {
      return new Response(JSON.stringify({ error: 'Invalid card index' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!cardType || typeof cardType !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid card type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!sourceImageUrl || typeof sourceImageUrl !== 'string') {
      return new Response(JSON.stringify({ error: 'Source image URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sanitize inputs
    const sanitizedProductName = productName.replace(/[<>\"']/g, '').trim();
    const sanitizedCategory = category.replace(/[<>\"']/g, '').trim();
    const sanitizedDescription = description.replace(/[<>\"']/g, '').trim();

    // Content filtering
    const blockedTerms = ['<script>', 'javascript:', 'data:', 'vbscript:', 'onload', 'onerror'];
    const fullText = `${productName} ${category} ${description}`.toLowerCase();
    
    if (blockedTerms.some(term => fullText.includes(term))) {
      return new Response(JSON.stringify({ error: 'Invalid content detected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get photo regeneration price from database
    const { data: pricingData, error: pricingError } = await supabase
      .from('generation_pricing')
      .select('tokens_cost')
      .eq('price_type', 'photo_regeneration')
      .single();

    if (pricingError || !pricingData) {
      console.error('Pricing error:', pricingError);
      return new Response(JSON.stringify({
        error: 'Failed to get pricing information'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokensRequired = pricingData.tokens_cost;

    // Check user token balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tokens_balance')
      .eq('id', userId)
      .single();

    if (profileError || !profile || profile.tokens_balance < tokensRequired) {
      return new Response(JSON.stringify({
        error: 'Insufficient tokens',
        required: tokensRequired,
        available: profile?.tokens_balance || 0
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Spend token
    const { error: spendError } = await supabase.rpc('spend_tokens', {
      user_id_param: userId,
      tokens_amount: tokensRequired
    });

    if (spendError) {
      return new Response(JSON.stringify({
        error: 'Failed to process payment'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate prompt from database
    const prompt = await getPromptTemplate(supabase, cardType, sanitizedProductName, sanitizedCategory, sanitizedDescription);

    // Use all original images (incl. optional reference) if provided, otherwise fallback to single sourceImageUrl
    const imagesToUse = productImages && Array.isArray(productImages) && productImages.length > 0
      ? productImages
      : [{
          url: sourceImageUrl,
          name: 'regeneration_source',
          type: 'product'
        }];

    // Create a temporary job for this single regeneration
    const { data: tempJob, error: jobError } = await supabase
      .from('generation_jobs')
      .insert({
        user_id: userId,
        product_name: sanitizedProductName,
        category: sanitizedCategory,
        description: sanitizedDescription,
        // IMPORTANT: keep full context so process-openai-task can use product + reference images
        product_images: imagesToUse,
        status: 'processing',
        total_cards: 1,
        tokens_cost: tokensRequired
      })
      .select()
      .single();

    if (jobError) {
      console.error('Job creation error:', jobError);
      
      // Refund token on failure
      await supabase.rpc('refund_tokens', {
        user_id_param: userId,
        tokens_amount: tokensRequired,
        reason_text: 'Возврат за ошибку создания задачи'
      });
      
      throw new Error(`Failed to create job: ${jobError.message}`);
    }

    // Create a generation task for this regeneration
    const { data: task, error: taskError } = await supabase
      .from('generation_tasks')
      .insert({
        job_id: tempJob.id,
        card_type: cardType,
        card_index: cardIndex,
        status: 'pending',
        prompt: prompt
      })
      .select()
      .single();

    if (taskError) {
      console.error('Task creation error:', taskError);
      
      // Refund token on failure
      await supabase.rpc('refund_tokens', {
        user_id_param: userId,
        tokens_amount: tokensRequired,
        reason_text: 'Возврат за ошибку создания задачи'
      });
      
      throw new Error(`Failed to create task: ${taskError.message}`);
    }

    // Delegate to process-openai-task for actual processing (fire and forget)
    console.log(`Delegating regeneration to process-openai-task for task ${task.id}`);
    
    supabase.functions.invoke('process-openai-task', {
      body: {
        taskId: task.id,
        sourceImageUrl: sourceImageUrl,
        prompt: prompt
      }
    }).catch(error => {
      console.error(`Failed to invoke process-openai-task for ${task.id}:`, error);
    });

    // Create notification about start
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'Перегенерация запущена',
        message: `Перегенерация карточки "${cardType}" для товара "${sanitizedProductName}" началась. Результат будет готов через несколько минут.`,
        type: 'info'
      });

    return new Response(JSON.stringify({ 
      success: true,
      message: `Перегенерация карточки ${cardType} запущена`,
      taskId: task.id,
      jobId: tempJob.id,
      cardIndex: cardIndex,
      cardType: cardType,
      status: 'processing'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in regenerate-single-card function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Произошла ошибка при перегенерации карточки' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});