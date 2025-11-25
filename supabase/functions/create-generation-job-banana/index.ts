import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CARD_STAGES = [
  { type: 'cover', index: 0 },
  { type: 'lifestyle', index: 1 },
  { type: 'macro', index: 2 },
  { type: 'usage', index: 3 },
  { type: 'infographic', index: 4 },
  { type: 'benefits', index: 5 },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, description, userId, productImages, selectedCards } = await req.json();

    // Validate inputs
    if (!productName?.trim() || !description?.trim() || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!productImages || productImages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one product image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get pricing
    const { data: pricing, error: pricingError } = await supabase
      .from('generation_pricing')
      .select('tokens_cost')
      .eq('price_type', 'photo_generation')
      .single();

    if (pricingError || !pricing) {
      throw new Error('Failed to get pricing information');
    }

    const cardsToGenerate = selectedCards || CARD_STAGES.map(s => s.index);
    const tokensCost = pricing.tokens_cost * cardsToGenerate.length;

    // Check user balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tokens_balance')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('Failed to get user profile');
    }

    if (profile.tokens_balance < tokensCost) {
      return new Response(
        JSON.stringify({ error: 'Insufficient tokens', required: tokensCost, available: profile.tokens_balance }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Spend tokens
    const { error: spendError } = await supabase.rpc('spend_tokens', {
      user_id_param: userId,
      tokens_amount: tokensCost,
    });

    if (spendError) {
      console.error('Failed to spend tokens:', spendError);
      throw new Error('Failed to deduct tokens');
    }

    // Extract category from description
    const category = description.split('\n')[0]?.replace('Категория:', '').trim() || 'Общее';

    // Create generation job
    const { data: job, error: jobError } = await supabase
      .from('generation_jobs')
      .insert({
        user_id: userId,
        product_name: productName,
        description: description,
        category: category,
        product_images: productImages,
        status: 'pending',
        total_cards: cardsToGenerate.length,
        tokens_cost: tokensCost,
      })
      .select()
      .single();

    if (jobError || !job) {
      // Refund tokens
      await supabase.rpc('refund_tokens', {
        user_id_param: userId,
        tokens_amount: tokensCost,
        reason_text: 'Возврат из-за ошибки создания задания генерации (Google)',
      });
      throw new Error('Failed to create generation job');
    }

    // Create tasks for selected cards
    const tasks = cardsToGenerate.map(cardIndex => {
      const stage = CARD_STAGES[cardIndex];
      return {
        job_id: job.id,
        card_index: cardIndex,
        card_type: stage.type,
        status: 'pending',
      };
    });

    const { error: tasksError } = await supabase
      .from('generation_tasks')
      .insert(tasks);

    if (tasksError) {
      console.error('Failed to create tasks:', tasksError);
      // Refund tokens
      await supabase.rpc('refund_tokens', {
        user_id_param: userId,
        tokens_amount: tokensCost,
        reason_text: 'Возврат из-за ошибки создания задач генерации (Google)',
      });
      throw new Error('Failed to create generation tasks');
    }

    // Invoke background processing function for Google
    try {
      await supabase.functions.invoke('process-generation-tasks-banana', {
        body: { jobId: job.id },
      });
    } catch (invokeError) {
      console.error('Failed to invoke background processor:', invokeError);
    }

    // Create notification
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'info',
      title: 'Генерация запущена',
      message: `Начата генерация ${cardsToGenerate.length} карточек для "${productName}" с помощью Google Gemini`,
      read: false,
    });

    return new Response(
      JSON.stringify({
        jobId: job.id,
        status: 'pending',
        tokensUsed: tokensCost,
        totalCards: cardsToGenerate.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-generation-job-banana:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});