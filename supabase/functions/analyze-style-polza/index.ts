import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { imageUrl, jobId } = await req.json();

    if (!imageUrl || !jobId) {
      return new Response(
        JSON.stringify({ error: 'Missing imageUrl or jobId' }),
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

    // Get the style-analysis prompt
    const { data: promptData, error: promptError } = await supabase
      .from('ai_prompts')
      .select('prompt_template')
      .eq('prompt_type', 'style-analysis')
      .eq('model_type', 'technical')
      .single();

    if (promptError || !promptData) {
      throw new Error('Failed to fetch style-analysis prompt');
    }

    const stylePrompt = promptData.prompt_template;

    console.log(`[analyze-style-polza] Calling Polza for style analysis, job: ${jobId}`);

    // Use chat/completions with image_url pointing to the image
    const aiResponse = await fetch(`${POLZA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${polzaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3.1-flash-lite-preview',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
            { type: 'text', text: stylePrompt },
          ],
        }],
        temperature: 0.3,
        max_tokens: 500,
        provider: {
          only: ["Google AI Studio"],
        },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[analyze-style-polza] Polza API error:', aiResponse.status, errorText);
      throw new Error(`Polza API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const styleDescription = aiData.choices?.[0]?.message?.content;

    if (!styleDescription) {
      throw new Error('No style description returned from Polza');
    }

    console.log(`[analyze-style-polza] Style description received (${styleDescription.length} chars)`);

    // Save style_description to the job
    await supabase
      .from('generation_jobs')
      .update({ style_description: styleDescription })
      .eq('id', jobId);

    return new Response(
      JSON.stringify({ success: true, styleDescription }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[analyze-style-polza] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
