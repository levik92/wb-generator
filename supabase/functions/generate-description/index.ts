import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { productName, category = '', competitors, keywords, userId } = requestBody;

    // Input validation
    if (!productName || typeof productName !== 'string' || productName.length > 200) {
      return new Response(JSON.stringify({ error: 'Invalid product name (max 200 characters)' }), {
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

    const sanitizedProductName = productName.replace(/[<>\"']/g, '').trim();
    const sanitizedCategory = category.replace(/[<>\"']/g, '').trim();

    const sanitizedCompetitors = Array.isArray(competitors) 
      ? competitors.slice(0, 10)
          .filter(c => typeof c === 'string' && c.length <= 500)
          .map(c => c.replace(/[<>\"']/g, '').trim())
          .filter(c => c.length > 0)
      : [];

    const sanitizedKeywords = Array.isArray(keywords)
      ? keywords.slice(0, 20)
          .filter(k => typeof k === 'string' && k.length <= 100)
          .map(k => k.replace(/[<>\"']/g, '').trim())
          .filter(k => k.length > 0)
      : [];

    const blockedTerms = ['<script>', 'javascript:', 'data:', 'vbscript:', 'onload', 'onerror', 'eval(', 'function(', 'setTimeout', 'setInterval'];
    const fullText = `${sanitizedProductName} ${sanitizedCategory} ${sanitizedCompetitors.join(' ')} ${sanitizedKeywords.join(' ')}`.toLowerCase();
    
    if (blockedTerms.some(term => fullText.includes(term))) {
      return new Response(JSON.stringify({ error: 'Invalid content detected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get pricing
    const { data: pricingData, error: pricingError } = await supabase
      .from('generation_pricing')
      .select('tokens_cost')
      .eq('price_type', 'description_generation')
      .single();

    if (pricingError || !pricingData) {
      console.error('Pricing error:', pricingError);
      return new Response(JSON.stringify({ error: 'Failed to get pricing information' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokensRequired = pricingData.tokens_cost;

    // Check balance
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('tokens_balance')
      .eq('id', userId)
      .single();

    if (profileError) {
      throw new Error('Ошибка при проверке баланса токенов');
    }

    if (!profileData || profileData.tokens_balance < tokensRequired) {
      return new Response(JSON.stringify({ 
        error: `Недостаточно токенов для генерации. Нужно ${tokensRequired} токенов.` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a 'processing' generation record FIRST
    const { data: genRecord, error: genInsertError } = await supabase
      .from('generations')
      .insert({
        user_id: userId,
        generation_type: 'description',
        input_data: {
          productName: sanitizedProductName,
          category: sanitizedCategory,
          competitors: sanitizedCompetitors,
          keywords: sanitizedKeywords
        },
        output_data: null,
        tokens_used: tokensRequired,
        status: 'processing',
        product_name: sanitizedProductName,
        category: sanitizedCategory,
        keywords: sanitizedKeywords,
        competitors: sanitizedCompetitors
      })
      .select('id')
      .single();

    if (genInsertError || !genRecord) {
      console.error('Error creating generation record:', genInsertError);
      throw new Error('Failed to create generation record');
    }

    const generationId = genRecord.id;
    console.log('[generate-description] Created generation record:', generationId);

    // Return immediately with the generation ID
    const immediateResponse = new Response(JSON.stringify({ 
      generationId,
      status: 'processing'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    // Process in background
    const backgroundTask = (async () => {
      try {
        // Get prompt template
        const { data: promptData, error: promptError } = await supabase
          .from('ai_prompts')
          .select('prompt_template')
          .eq('prompt_type', 'description')
          .single();

        if (promptError) {
          throw new Error('Ошибка получения шаблона промта');
        }

        const competitorText = sanitizedCompetitors.length > 0 ? sanitizedCompetitors.join(', ') : '';
        const keywordText = sanitizedKeywords.length > 0 ? sanitizedKeywords.join(', ') : '';
        
        let prompt = promptData.prompt_template;
        prompt = prompt.replace(/{productName}/g, sanitizedProductName);
        prompt = prompt.replace(/{category}/g, sanitizedCategory);
        prompt = prompt.replace(/{competitors}/g, competitorText);
        prompt = prompt.replace(/{keywords}/g, keywordText);

        // Call OpenAI
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1000,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          console.error('OpenAI API error:', response.status, errorData);
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const generatedDescription = data.choices[0].message.content;

        // Spend tokens
        const { error: tokenError } = await supabase.rpc('spend_tokens', {
          user_id_param: userId,
          tokens_amount: tokensRequired
        });

        if (tokenError) {
          console.error('Token spending error:', tokenError);
        }

        // Update generation record to completed
        await supabase
          .from('generations')
          .update({
            status: 'completed',
            output_data: { description: generatedDescription },
            updated_at: new Date().toISOString()
          })
          .eq('id', generationId);

        console.log('[generate-description] Generation completed:', generationId);

      } catch (error) {
        console.error('[generate-description] Background error:', error);
        
        // Mark as failed
        await supabase
          .from('generations')
          .update({
            status: 'failed',
            output_data: { error: error.message || 'Generation failed' },
            updated_at: new Date().toISOString()
          })
          .eq('id', generationId);

        // Refund tokens
        await supabase.rpc('refund_tokens', {
          user_id_param: userId,
          tokens_amount: tokensRequired,
          reason_text: 'Возврат за неудачную генерацию описания'
        });
      }
    })();

    // Use EdgeRuntime.waitUntil for background processing
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(backgroundTask);
    } else {
      // Fallback: wait for completion
      await backgroundTask;
    }

    return immediateResponse;

  } catch (error) {
    console.error('Error in generate-description function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Произошла ошибка при генерации описания' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
