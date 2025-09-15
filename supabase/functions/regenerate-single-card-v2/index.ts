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
    .single();

  if (promptError) {
    throw new Error(`Failed to fetch prompt template for ${promptType}: ${promptError.message}`);
  }

  // Replace placeholders in the prompt template
  let prompt = promptData.prompt_template;
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
    const { productName, category, description, userId, cardIndex, cardType, sourceImageUrl } = requestBody;

    // Input validation
    if (!productName || typeof productName !== 'string' || productName.length > 100) {
      return new Response(JSON.stringify({ error: 'Invalid product name' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!category || typeof category !== 'string' || category.length > 50) {
      return new Response(JSON.stringify({ error: 'Invalid category' }), {
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

    // Check user token balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tokens_balance')
      .eq('id', userId)
      .single();

    if (profileError || !profile || profile.tokens_balance < 10) {
      return new Response(JSON.stringify({
        error: 'Insufficient tokens',
        required: 10,
        available: profile?.tokens_balance || 0
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Spend token
    const { error: spendError } = await supabase.rpc('spend_tokens', {
      user_id_param: userId,
      tokens_amount: 10
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

    // Download the source image
    console.log(`Downloading source image: ${sourceImageUrl}`);
    const sourceImageResponse = await fetch(sourceImageUrl);
    if (!sourceImageResponse.ok) {
      throw new Error(`Failed to download source image: ${sourceImageResponse.statusText}`);
    }
    
    const sourceImageBuffer = await sourceImageResponse.arrayBuffer();
    const sourceImageBlob = new Blob([sourceImageBuffer], { type: 'image/png' });

    // Edit image with OpenAI DALL-E-2
    console.log(`Calling OpenAI image edit API`);
    
    const formData = new FormData();
    formData.append('image', sourceImageBlob, 'source.png');
    formData.append('prompt', prompt);
    formData.append('n', '1');
    formData.append('size', '1024x1536');
    
    const imageResponse = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
      },
      body: formData,
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error('OpenAI API error:', errorText);
      
      // Refund token on failure
      await supabase.rpc('refund_tokens', {
        user_id_param: userId,
        tokens_amount: 10,
        reason_text: 'Возврат за неудачную генерацию'
      });

      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const imageData = await imageResponse.json();
    
    if (!imageData.data || !imageData.data[0] || !imageData.data[0].url) {
      // Refund token on failure
      await supabase.rpc('refund_tokens', {
        user_id_param: userId,
        tokens_amount: 10,
        reason_text: 'Возврат за неудачную генерацию'
      });
      
      throw new Error('Invalid OpenAI response');
    }

    const imageUrl = imageData.data[0].url;

    // Download and upload to Supabase Storage
    const imageBuffer = await fetch(imageUrl).then(r => r.arrayBuffer());
    const fileName = `regenerated/${userId}/${Date.now()}_${cardType}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from('generated-cards')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      
      // Refund token on failure
      await supabase.rpc('refund_tokens', {
        user_id_param: userId,
        tokens_amount: 10,
        reason_text: 'Возврат за неудачную загрузку'
      });
      
      throw new Error(`Upload error: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('generated-cards')
      .getPublicUrl(fileName);

    // Log the generation - удалено, так как таблицы generation_logs не существует
    
    // Create notification
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'Карточка перегенерирована',
        message: `Карточка "${cardType}" для товара "${sanitizedProductName}" успешно перегенерирована.`,
        type: 'success'
      });

    return new Response(JSON.stringify({ 
      success: true,
      message: `Карточка ${cardType} перегенерирована`,
      imageUrl: publicUrl,
      cardIndex: cardIndex,
      cardType: cardType
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