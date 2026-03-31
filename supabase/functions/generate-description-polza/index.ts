import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const POLZA_BASE_URL = 'https://polza.ai/api/v1';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, category = 'товар', competitors, keywords, userId } = await req.json();

    if (!productName?.trim() || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sanitizedProductName = productName.trim().slice(0, 200);
    const sanitizedCategory = (category?.trim() || 'товар').slice(0, 100);
    const sanitizedCompetitors = (competitors || []).map((c: string) => c.trim().slice(0, 500)).filter(Boolean);
    const sanitizedKeywords = (keywords || []).map((k: string) => k.trim().slice(0, 100)).filter(Boolean);

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
    const polzaApiKey = Deno.env.get('POLZA_AI_API_KEY');

    if (!polzaApiKey) {
      throw new Error('POLZA_AI_API_KEY not configured');
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

    // Check balance
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

    // Create 'processing' generation record
    const { data: genRecord, error: genInsertError } = await supabase
      .from('generations')
      .insert({
        user_id: userId,
        generation_type: 'description',
        product_name: sanitizedProductName,
        category: sanitizedCategory,
        competitors: sanitizedCompetitors,
        keywords: sanitizedKeywords,
        input_data: { productName: sanitizedProductName, category: sanitizedCategory },
        output_data: null,
        tokens_used: tokensCost,
        status: 'processing',
      })
      .select('id')
      .single();

    if (genInsertError || !genRecord) {
      throw new Error('Failed to create generation record');
    }

    const generationId = genRecord.id;

    // Return immediately
    const immediateResponse = new Response(
      JSON.stringify({ generationId, status: 'processing' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

    // Background processing
    const backgroundTask = (async () => {
      try {
        // Get prompt template (same as direct Gemini - uses google model_type prompts)
        const { data: promptData, error: promptError } = await supabase
          .from('ai_prompts')
          .select('prompt_template')
          .eq('prompt_type', 'description')
          .eq('model_type', 'google')
          .single();

        if (promptError || !promptData) {
          throw new Error('Failed to fetch prompt template');
        }

        let finalPrompt = promptData.prompt_template
          .replace('{productName}', sanitizedProductName)
          .replace('{category}', sanitizedCategory)
          .replace('{competitors}', sanitizedCompetitors.join(', ') || 'не указано')
          .replace('{keywords}', sanitizedKeywords.join(', ') || 'не указано');

        console.log('[generate-description-polza] Calling Polza AI for description generation');

        const aiResponse = await fetch(`${POLZA_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${polzaApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3.1-pro-preview',
            messages: [{ role: 'user', content: finalPrompt }],
            provider: {
              order: ["Google AI Studio", "Google"],
              allow_fallbacks: true,
            },
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error('[generate-description-polza] Polza API error:', aiResponse.status, errorText);
          throw new Error(`Polza API error: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        const generatedText = aiData.choices?.[0]?.message?.content;

        if (!generatedText) {
          throw new Error('No content generated');
        }

        // Spend tokens
        await supabase.rpc('spend_tokens', {
          user_id_param: userId,
          tokens_amount: tokensCost,
        });

        // Update to completed
        await supabase
          .from('generations')
          .update({
            status: 'completed',
            output_data: { description: generatedText },
            updated_at: new Date().toISOString()
          })
          .eq('id', generationId);

        console.log('[generate-description-polza] Generation completed:', generationId);

      } catch (error) {
        console.error('[generate-description-polza] Background error:', error);
        
        await supabase
          .from('generations')
          .update({
            status: 'failed',
            output_data: { error: error.message || 'Generation failed' },
            updated_at: new Date().toISOString()
          })
          .eq('id', generationId);

        await supabase.rpc('refund_tokens', {
          user_id_param: userId,
          tokens_amount: tokensCost,
          reason_text: 'Возврат за неудачную генерацию описания (Polza)'
        });
      }
    })();

    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(backgroundTask);
    } else {
      await backgroundTask;
    }

    return immediateResponse;

  } catch (error) {
    console.error('Error in generate-description-polza:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
