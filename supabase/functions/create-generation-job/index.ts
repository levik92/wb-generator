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
    const { 
      productName, 
      category, 
      description, 
      userId, 
      productImages = []
    } = requestBody;

    // Validate input
    if (!productName || !category || !description || !userId) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: productName, category, description, userId'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    const tokensRequired = 6;
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

    // Create generation job
    const { data: job, error: jobError } = await supabase
      .from('generation_jobs')
      .insert({
        user_id: userId,
        product_name: productName,
        category: category,
        description: description,
        product_images: productImages,
        status: 'pending',
        total_cards: 6,
        tokens_cost: tokensRequired
      })
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

    // Create individual tasks for each card
    const tasks = CARD_STAGES.map((stage, index) => ({
      job_id: job.id,
      card_index: index,
      card_type: stage.key,
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

    // Start background processing
    EdgeRuntime.waitUntil(
      supabase.functions.invoke('process-generation-tasks', {
        body: { jobId: job.id }
      }).catch(error => {
        console.error('Failed to start background processing:', error);
      })
    );

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