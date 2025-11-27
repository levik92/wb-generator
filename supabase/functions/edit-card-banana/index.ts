import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getPromptTemplate(supabase: any, promptType: string, productName: string, editInstructions: string): Promise<string> {
  const { data: promptData, error: promptError } = await supabase
    .from('ai_prompts')
    .select('prompt_template')
    .eq('prompt_type', promptType)
    .eq('model_type', 'google')
    .single();

  if (promptError || !promptData) {
    console.error('Error fetching prompt:', promptError);
    return `Отредактируй изображение товара ${productName} согласно следующим требованиям: ${editInstructions}. Сохрани общий стиль и композицию изображения, внеси только запрошенные изменения.`;
  }

  return promptData.prompt_template
    .replace(/{productName}/g, productName)
    .replace(/{editInstructions}/g, editInstructions);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, userId, cardIndex, cardType, sourceImageUrl, editInstructions } = await req.json();

    if (!productName || !userId || cardIndex === undefined || !cardType || !sourceImageUrl || !editInstructions) {
      throw new Error('Missing required fields');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get edit pricing
    const { data: pricing, error: pricingError } = await supabase
      .from('generation_pricing')
      .select('tokens_cost')
      .eq('price_type', 'photo_edit')
      .single();

    if (pricingError || !pricing) {
      throw new Error('Failed to fetch pricing');
    }

    const tokensCost = pricing.tokens_cost;

    // Check and spend tokens
    const { data: spendResult, error: spendError } = await supabase.rpc('spend_tokens', {
      user_id_param: userId,
      tokens_amount: tokensCost
    });

    if (spendError || !spendResult) {
      throw new Error('Insufficient tokens');
    }

    // Create job
    const { data: job, error: jobError } = await supabase
      .from('generation_jobs')
      .insert({
        user_id: userId,
        product_name: productName,
        category: 'edit',
        description: `Редактирование: ${editInstructions}`,
        status: 'processing',
        total_cards: 1,
        tokens_cost: tokensCost
      })
      .select()
      .single();

    if (jobError || !job) {
      await supabase.rpc('refund_tokens', {
        user_id_param: userId,
        tokens_amount: tokensCost,
        reason_text: 'Ошибка создания задачи редактирования'
      });
      throw new Error('Failed to create job');
    }

    // Create task
    const { data: task, error: taskError } = await supabase
      .from('generation_tasks')
      .insert({
        job_id: job.id,
        card_index: cardIndex,
        card_type: cardType,
        status: 'processing'
      })
      .select()
      .single();

    if (taskError || !task) {
      await supabase.rpc('refund_tokens', {
        user_id_param: userId,
        tokens_amount: tokensCost,
        reason_text: 'Ошибка создания задачи редактирования'
      });
      throw new Error('Failed to create task');
    }

    // Get prompt template
    const prompt = await getPromptTemplate(supabase, 'edit', productName, editInstructions);

    // Call processing function
    const { error: processingError } = await supabase.functions.invoke('process-google-task', {
      body: {
        taskId: task.id,
        sourceImageUrl: sourceImageUrl,
        prompt: prompt
      }
    });

    if (processingError) {
      console.error('Processing error:', processingError);
    }

    // Create notification
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'info',
      title: 'Редактирование запущено',
      message: `Редактирование карточки "${productName}" начато`
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        taskId: task.id, 
        jobId: job.id,
        status: 'processing',
        tokensUsed: tokensCost
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
