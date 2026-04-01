import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const POLZA_BASE_URL = 'https://polza.ai/api/v1';
const DEFAULT_PROMPT = 'Определи товар на изображении. Верни только наименование товара на русском языке длиной до 120 символов с учетом пробелов. Без описания, без кавычек, без точки в конце.';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Missing image data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const polzaApiKey = Deno.env.get('POLZA_AI_API_KEY');
    if (!polzaApiKey) {
      throw new Error('POLZA_AI_API_KEY not configured');
    }

    // Fetch prompt from DB
    let prompt = DEFAULT_PROMPT;
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data } = await supabase
        .from('ai_prompts')
        .select('prompt_template')
        .eq('prompt_type', 'identify-product')
        .eq('model_type', 'technical')
        .limit(1)
        .single();
      if (data?.prompt_template) {
        prompt = data.prompt_template;
      }
    } catch (e) {
      console.warn('[identify-product-polza] Failed to fetch prompt from DB, using default:', e.message);
    }

    // Strip data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    // Use Polza chat/completions with image_url content
    const aiResponse = await fetch(`${POLZA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${polzaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Data}`,
              },
            },
          ],
        }],
        provider: {
          only: ["Google AI Studio"],
        },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[identify-product-polza] Polza API error:', aiResponse.status, errorText);
      throw new Error(`Polza API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const productName = aiData.choices?.[0]?.message?.content?.trim() || '';

    console.log('[identify-product-polza] Detected:', productName);

    return new Response(
      JSON.stringify({ productName }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in identify-product-polza:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
