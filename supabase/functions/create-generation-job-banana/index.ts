import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Same card stages as v2 for consistency
const CARD_STAGES = [
  { name: "Главная", key: "cover" },
  { name: "Образ жизни", key: "lifestyle" },
  { name: "Макро", key: "macro" },
  { name: "До/После", key: "beforeAfter" },
  { name: "Комплект", key: "bundle" },
  { name: "Гарантия", key: "guarantee" }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestBody = await req.json();
    console.log('[create-generation-job-banana] Request received:', JSON.stringify(requestBody));
    
    const { 
      productName, 
      category = '', 
      description, 
      userId, 
      productImages = [],
      referenceImageUrl = null,
      selectedCards = [0, 1, 2, 3, 4, 5] // Default all cards
    } = requestBody;

    // Validate input
    if (!productName || !description || !userId) {
      console.log('[create-generation-job-banana] Missing required fields');
      return new Response(JSON.stringify({
        error: 'Missing required fields: productName, description, userId'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get photo generation price from database
    const { data: pricingData, error: pricingError } = await supabase
      .from('generation_pricing')
      .select('tokens_cost')
      .eq('price_type', 'photo_generation')
      .single();

    if (pricingError || !pricingData) {
      console.error('[create-generation-job-banana] Pricing error:', pricingError);
      return new Response(JSON.stringify({
        error: 'Failed to get pricing information'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokensPerCard = pricingData.tokens_cost;
    console.log('[create-generation-job-banana] Tokens per card:', tokensPerCard);

    // Check user token balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tokens_balance')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('[create-generation-job-banana] Profile error:', profileError);
      return new Response(JSON.stringify({
        error: 'User profile not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokensRequired = selectedCards.length * tokensPerCard;
    console.log('[create-generation-job-banana] Tokens required:', tokensRequired, 'Available:', profile.tokens_balance);
    
    if (profile.tokens_balance < tokensRequired) {
      return new Response(JSON.stringify({
        error: 'Insufficient tokens',
        required: tokensRequired,
        available: profile.tokens_balance
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Spend tokens immediately
    const spendResult = await supabase.rpc('spend_tokens', {
      user_id_param: userId,
      tokens_amount: tokensRequired
    });

    if (spendResult.error || !spendResult.data) {
      console.error('[create-generation-job-banana] Failed to spend tokens:', spendResult.error);
      return new Response(JSON.stringify({
        error: 'Failed to process payment'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate that we have at least one product image for editing
    if (!productImages || productImages.length === 0) {
      return new Response(JSON.stringify({
        error: 'At least one product image is required for image editing'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare product images array with reference if provided
    let finalProductImages = productImages;
    if (referenceImageUrl) {
      finalProductImages = [
        ...productImages,
        { url: referenceImageUrl, type: 'reference' }
      ];
    }

    // Create generation job
    const { data: job, error: jobError } = await supabase
      .from('generation_jobs')
      .insert({
        user_id: userId,
        product_name: productName,
        category: category,
        description: description,
        product_images: finalProductImages,
        status: 'pending',
        total_cards: selectedCards.length,
        tokens_cost: tokensRequired
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('[create-generation-job-banana] Job creation error:', jobError);
      
      // Refund tokens on failure
      await supabase.rpc('refund_tokens', {
        user_id_param: userId,
        tokens_amount: tokensRequired,
        reason_text: 'Возврат за неудачное создание задачи'
      });

      return new Response(JSON.stringify({
        error: 'Failed to create generation job'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[create-generation-job-banana] Job created:', job.id);

    // Create individual tasks for selected cards only
    const tasks = selectedCards.map((cardIndex: number) => ({
      job_id: job.id,
      card_index: cardIndex,
      card_type: CARD_STAGES[cardIndex].key,
      status: 'pending'
    }));

    const { error: tasksError } = await supabase
      .from('generation_tasks')
      .insert(tasks);

    if (tasksError) {
      console.error('[create-generation-job-banana] Tasks creation error:', tasksError);
      
      // Refund tokens and mark job as failed
      await supabase.rpc('refund_tokens', {
        user_id_param: userId,
        tokens_amount: tokensRequired,
        reason_text: 'Возврат за неудачное создание задач'
      });

      await supabase
        .from('generation_jobs')
        .update({ status: 'failed', error_message: 'Failed to create tasks' })
        .eq('id', job.id);

      return new Response(JSON.stringify({
        error: 'Failed to create generation tasks'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[create-generation-job-banana] Tasks created, starting background processing');

    // Start background processing using Google Gemini processor
    const backgroundTask = async () => {
      try {
        await supabase.functions.invoke('process-generation-tasks-banana', {
          body: { jobId: job.id }
        });
        console.log(`[create-generation-job-banana] Background processing started for job ${job.id}`);
      } catch (error) {
        console.error('[create-generation-job-banana] Failed to start background processing:', error);
      }
    };
    
    // Start background task
    backgroundTask().catch(error => {
      console.error('[create-generation-job-banana] Background task error:', error);
    });

    // Create notification
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'Генерация началась',
        message: `Генерация ${productName} поставлена в очередь. Вы получите уведомление по завершении.`,
        type: 'info'
      });

    console.log(`[create-generation-job-banana] Created generation job ${job.id} for user ${userId}`);

    // Return response matching v2 format - IMPORTANT: frontend expects {success: true, jobId}
    return new Response(JSON.stringify({
      success: true,
      jobId: job.id,
      message: 'Generation job created successfully'
    }), {
      status: 202,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[create-generation-job-banana] Error:', error);
    
    return new Response(JSON.stringify({
      error: error.message || 'Произошла ошибка при создании задачи генерации'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
