import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getPromptTemplate(supabase: any, promptType: string, productName: string, editInstructions: string): Promise<string> {
  console.log(`Fetching prompt template for type: ${promptType}, product: ${productName}`);
  
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
    const body = await req.json();
    const { productName, userId, cardIndex, cardType, sourceImageUrl, editInstructions } = body;

    console.log('Edit card request:', { productName, userId, cardIndex, cardType, sourceImageUrl: sourceImageUrl?.substring(0, 50), editInstructions });

    if (!productName || !userId || cardIndex === undefined || !cardType || !sourceImageUrl || !editInstructions) {
      console.error('Missing required fields:', { productName, userId, cardIndex, cardType, sourceImageUrl: !!sourceImageUrl, editInstructions });
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      console.error('Failed to fetch pricing:', pricingError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch pricing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokensCost = pricing.tokens_cost;
    console.log(`Tokens cost for edit: ${tokensCost}`);

    // Check and spend tokens
    const { data: spendResult, error: spendError } = await supabase.rpc('spend_tokens', {
      user_id_param: userId,
      tokens_amount: tokensCost
    });

    if (spendError || !spendResult) {
      console.error('Insufficient tokens:', spendError);
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient tokens' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Tokens spent successfully');

    // Create job with product_images - this is what process-google-task expects
    const { data: job, error: jobError } = await supabase
      .from('generation_jobs')
      .insert({
        user_id: userId,
        product_name: productName,
        category: 'edit',
        description: `Редактирование: ${editInstructions}`,
        status: 'processing',
        total_cards: 1,
        tokens_cost: tokensCost,
        product_images: [{
          url: sourceImageUrl,
          name: 'edit_source',
          type: 'product' // Important: must be 'product' type for process-google-task
        }]
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('Failed to create job:', jobError);
      await supabase.rpc('refund_tokens', {
        user_id_param: userId,
        tokens_amount: tokensCost,
        reason_text: 'Ошибка создания задачи редактирования'
      });
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Job created:', job.id);

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
      console.error('Failed to create task:', taskError);
      await supabase.rpc('refund_tokens', {
        user_id_param: userId,
        tokens_amount: tokensCost,
        reason_text: 'Ошибка создания задачи редактирования'
      });
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create task' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Task created:', task.id);

    // Get prompt template - use 'edit-card' for editing
    const prompt = await getPromptTemplate(supabase, 'edit-card', productName, editInstructions);
    console.log('Generated prompt:', prompt.substring(0, 100) + '...');

    // Call processing function with the source image URL
    // Note: process-google-task reads product_images from job, but we also pass sourceImageUrl for compatibility
    console.log('Invoking process-google-task...');
    const { error: processingError } = await supabase.functions.invoke('process-google-task', {
      body: {
        taskId: task.id,
        sourceImageUrl: sourceImageUrl,
        prompt: prompt
      }
    });

    if (processingError) {
      console.error('Processing error:', processingError);
      // Don't fail - the task is created and might be processed later
      // Just log the error and return success since task/job are created
      console.log('Note: process-google-task invocation failed, but task is created');
    } else {
      console.log('process-google-task invoked successfully');
    }

    // Create notification
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'info',
      title: 'Редактирование запущено',
      message: `Редактирование карточки "${productName}" начато`
    });

    console.log('Edit card request completed successfully');

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
    console.error('Error in edit-card-banana:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
