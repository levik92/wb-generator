import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY not configured');
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
      console.warn('[identify-product] Failed to fetch prompt from DB, using default:', e.message);
    }

    // Strip data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    // Load proxy settings
    const { data: proxyData } = await supabase
      .from('ai_model_settings')
      .select('proxy_enabled, proxy_url, proxy_username, proxy_password')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let proxiedFetch = fetch;
    if (proxyData?.proxy_enabled && proxyData?.proxy_url) {
      try {
        const proxyOpts: any = { url: proxyData.proxy_url };
        if (proxyData.proxy_username) {
          proxyOpts.basicAuth = { username: proxyData.proxy_username, password: proxyData.proxy_password || '' };
        }
        const client = (Deno as any).createHttpClient({ proxy: proxyOpts });
        proxiedFetch = (input: any, init?: any) => fetch(input, { ...init, client });
        console.log(`[identify-product] Using proxy: ${proxyData.proxy_url}`);
      } catch (e) {
        console.warn('[identify-product] Proxy setup failed, using direct:', (e as any).message);
      }
    }

    const aiResponse = await proxiedFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Data,
                },
              },
            ],
          }],
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Gemini API error:', aiResponse.status, errorText);
      throw new Error(`Gemini API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const productName = aiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    console.log('[identify-product] Detected:', productName);

    return new Response(
      JSON.stringify({ productName }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in identify-product:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
