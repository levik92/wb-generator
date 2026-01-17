import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CARD_STAGES = [
  { name: "Главная", key: "cover" },
  { name: "Образ жизни", key: "lifestyle" },
  { name: "Макро", key: "macro" },
  { name: "До/После", key: "beforeAfter" },
  { name: "Комплект", key: "bundle" },
  { name: "Гарантия", key: "guarantee" },
  { name: "Редактирование основная", key: "mainEdit" }
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
    const { 
      productName, 
      category = '', 
      description, 
      userId, 
      productImages = [],
      referenceImageUrl = null,
      selectedCards = [0, 1, 2, 3, 4, 5] // По умолчанию все карточки
    } = requestBody;

    // Validate input
    if (!productName || !description || !userId) {
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
      console.error('Pricing error:', pricingError);
      return new Response(JSON.stringify({
        error: 'Failed to get pricing information'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokensPerCard = pricingData.tokens_cost;

    // Check user token balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tokens_balance')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      return new Response(JSON.stringify({
        error: 'User profile not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokensRequired = selectedCards.length * tokensPerCard;
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
      console.error('Failed to spend tokens:', spendResult.error);
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

    // Create generation job
    const jobData: any = {
      user_id: userId,
      product_name: productName,
      category: category,
      description: description,
      product_images: productImages,
      status: 'pending',
      total_cards: selectedCards.length,
      tokens_cost: tokensRequired
    };

    // Add reference image if provided
    if (referenceImageUrl) {
      jobData.product_images = [
        ...productImages,
        { url: referenceImageUrl, type: 'reference' }
      ];
    }

    const { data: job, error: jobError } = await supabase
      .from('generation_jobs')
      .insert(jobData)
      .select()
      .single();

    if (jobError || !job) {
      console.error('Job creation error:', jobError);
      
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
      console.error('Tasks creation error:', tasksError);
      
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

    // Start background processing using proper background task handling
    const backgroundTask = async () => {
      try {
        await supabase.functions.invoke('process-generation-tasks-v2', {
          body: { jobId: job.id }
        });
        console.log(`Background processing started successfully for job ${job.id}`);
      } catch (error) {
        console.error('Failed to start background processing:', error);
      }
    };
    
    // Start background task (no waitUntil needed in standard edge functions)
    backgroundTask().catch(error => {
      console.error('Background task error:', error);
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

    console.log(`Created generation job ${job.id} for user ${userId}`);

    return new Response(JSON.stringify({
      success: true,
      jobId: job.id,
      message: 'Generation job created successfully'
    }), {
      status: 202,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in create-generation-job function:', error);
    
    return new Response(JSON.stringify({
      error: error.message || 'Произошла ошибка при создании задачи генерации'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});