import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map frontend card types to Google prompt types in database
const cardTypeToPromptType: Record<string, string> = {
  'cover': 'cover',
  'features': 'features', 
  'macro': 'macro',
  'usage': 'beforeAfter',    // "Товар в использовании" -> beforeAfter (карточка-инструкция, товар в действии)
  'comparison': 'bundle',    // "Сравнение с другими товарами" -> bundle (карточка сравнения)
  'clean': 'guarantee',      // "Фото без инфографики" -> guarantee (чистое имиджевое фото без текста)
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

  try {
    const {
      productName,
      category,
      description,
      userId,
      cardIndex,
      cardType,
      sourceImageUrl,
    } = await req.json();

    // Validate inputs
    if (!productName?.trim() || !userId || cardIndex === undefined || !cardType || !sourceImageUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize inputs
    const sanitizedProductName = productName.trim().slice(0, 200);
    const sanitizedCategory = (category?.trim() || 'товар').slice(0, 100);
    const sanitizedDescription = description?.trim().slice(0, 2000) || '';

    // Content filtering
    const blockedTerms = ['porn', 'xxx', 'illegal'];
    const allText = [sanitizedProductName, sanitizedCategory, sanitizedDescription].join(' ').toLowerCase();
    if (blockedTerms.some(term => allText.includes(term))) {
      return new Response(
        JSON.stringify({ error: 'Inappropriate content detected' }),
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
      .eq('price_type', 'photo_regeneration')
      .single();

    if (pricingError || !pricing) {
      throw new Error('Failed to get pricing information');
    }

    const tokensCost = pricing.tokens_cost;

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
        JSON.stringify({ error: 'Insufficient tokens' }),
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

    // Create temporary job for tracking with product_images
    const { data: job, error: jobError } = await supabase
      .from('generation_jobs')
      .insert({
        user_id: userId,
        product_name: sanitizedProductName,
        description: sanitizedDescription,
        category: sanitizedCategory,
        status: 'processing',
        total_cards: 1,
        tokens_cost: tokensCost,
        product_images: [{
          url: sourceImageUrl,
          name: 'regeneration_source',
          type: 'product'
        }]
      })
      .select()
      .single();

    if (jobError || !job) {
      await supabase.rpc('refund_tokens', {
        user_id_param: userId,
        tokens_amount: tokensCost,
        reason_text: 'Возврат из-за ошибки создания задания регенерации',
      });
      throw new Error('Failed to create regeneration job');
    }

    // Create task
    const { data: task, error: taskError } = await supabase
      .from('generation_tasks')
      .insert({
        job_id: job.id,
        card_index: cardIndex,
        card_type: cardType,
        status: 'processing',
      })
      .select()
      .single();

    if (taskError || !task) {
      await supabase.rpc('refund_tokens', {
        user_id_param: userId,
        tokens_amount: tokensCost,
        reason_text: 'Возврат из-за ошибки создания задачи регенерации',
      });
      throw new Error('Failed to create regeneration task');
    }

    // Get prompt template - map card type to actual prompt type in database
    const promptType = cardTypeToPromptType[cardType] || 'cover';
    console.log(`Regenerating card type "${cardType}" using prompt type "${promptType}"`);
    
    const prompt = await getPromptTemplate(
      supabase,
      promptType,
      sanitizedProductName,
      sanitizedCategory,
      sanitizedDescription
    );

    // Invoke Google task processor
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

    // Create notification
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'info',
      title: 'Регенерация запущена',
      message: `Начата регенерация карточки "${cardType}" для "${sanitizedProductName}"`,
      read: false,
    });

    return new Response(
      JSON.stringify({
        success: true,
        taskId: task.id,
        jobId: job.id,
        status: 'processing',
        tokensUsed: tokensCost,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in regenerate-single-card-banana:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});