import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { imageUrl, jobId } = await req.json();

    if (!imageUrl || !jobId) {
      return new Response(
        JSON.stringify({ error: 'Missing imageUrl or jobId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the style-analysis prompt from ai_prompts
    const { data: promptData, error: promptError } = await supabase
      .from('ai_prompts')
      .select('prompt_template')
      .eq('prompt_type', 'style-analysis')
      .eq('model_type', 'technical')
      .single();

    if (promptError || !promptData) {
      console.error('[analyze-style] Failed to fetch prompt:', promptError);
      throw new Error('Failed to fetch style-analysis prompt');
    }

    const stylePrompt = promptData.prompt_template;

    // Download the image and convert to base64
    console.log(`[analyze-style] Downloading image: ${imageUrl}`);
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(
      new Uint8Array(imageBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // Determine MIME type
    const contentType = imageResponse.headers.get('content-type') || 'image/png';
    const mimeType = contentType.split(';')[0].trim();

    // Call Google Gemini API directly
    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY not configured');
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${geminiApiKey}`;

    console.log(`[analyze-style] Calling Gemini for style analysis, job: ${jobId}`);

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image,
              }
            },
            {
              text: stylePrompt,
            }
          ]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500,
        }
      })
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('[analyze-style] Gemini API error:', geminiResponse.status, errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const styleDescription = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!styleDescription) {
      console.error('[analyze-style] No text in Gemini response:', JSON.stringify(geminiData));
      throw new Error('No style description returned from Gemini');
    }

    console.log(`[analyze-style] Style description received (${styleDescription.length} chars): ${styleDescription.substring(0, 100)}...`);

    // Save style_description to the job
    const { error: updateError } = await supabase
      .from('generation_jobs')
      .update({ style_description: styleDescription })
      .eq('id', jobId);

    if (updateError) {
      console.error('[analyze-style] Failed to save style_description:', updateError);
    }

    return new Response(
      JSON.stringify({ success: true, styleDescription }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[analyze-style] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
