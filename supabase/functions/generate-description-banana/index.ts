import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, category, competitors, keywords, userId } = await req.json();

    // Validate inputs
    if (!productName?.trim() || !category?.trim() || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize inputs
    const sanitizedProductName = productName.trim().slice(0, 200);
    const sanitizedCategory = category.trim().slice(0, 100);
    const sanitizedCompetitors = (competitors || []).map((c: string) => c.trim().slice(0, 500)).filter(Boolean);
    const sanitizedKeywords = (keywords || []).map((k: string) => k.trim().slice(0, 100)).filter(Boolean);

    // Content filtering
    const blockedTerms = ['porn', 'xxx', 'illegal'];
    const allText = [sanitizedProductName, sanitizedCategory, ...sanitizedCompetitors, ...sanitizedKeywords].join(' ').toLowerCase();
    if (blockedTerms.some(term => allText.includes(term))) {
      return new Response(
        JSON.stringify({ error: 'Inappropriate content detected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get pricing
    const { data: pricing, error: pricingError } = await supabase
      .from('generation_pricing')
      .select('tokens_cost')
      .eq('price_type', 'description_generation')
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

    // Get prompt template for Google model
    const { data: promptData, error: promptError } = await supabase
      .from('ai_prompts')
      .select('prompt_template')
      .eq('prompt_type', 'description')
      .eq('model_type', 'google')
      .single();

    if (promptError || !promptData) {
      console.error('Prompt fetch error:', promptError);
      throw new Error('Failed to fetch prompt template');
    }

    let finalPrompt = promptData.prompt_template
      .replace('{productName}', sanitizedProductName)
      .replace('{category}', sanitizedCategory)
      .replace('{competitors}', sanitizedCompetitors.join(', ') || 'не указано')
      .replace('{keywords}', sanitizedKeywords.join(', ') || 'не указано');

    console.log('Using Lovable AI Gateway (Google Gemini) for description generation');

    // Call Lovable AI Gateway with Google Gemini model
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-preview',
        messages: [
          {
            role: 'user',
            content: finalPrompt
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted, please add funds' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('Failed to generate description');
    }

    const aiData = await aiResponse.json();
    const generatedText = aiData.choices?.[0]?.message?.content;

    if (!generatedText) {
      console.error('No content in AI response:', aiData);
      throw new Error('No content generated');
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

    // Save generation
    await supabase.from('generations').insert({
      user_id: userId,
      generation_type: 'description',
      product_name: sanitizedProductName,
      category: sanitizedCategory,
      competitors: sanitizedCompetitors,
      keywords: sanitizedKeywords,
      input_data: { productName: sanitizedProductName, category: sanitizedCategory },
      output_data: { description: generatedText },
      tokens_used: tokensCost,
      status: 'completed',
    });

    return new Response(
      JSON.stringify({
        description: generatedText,
        tokensUsed: tokensCost,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-description-banana:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});