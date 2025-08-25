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
    const { productName, category, competitors, keywords, userId } = await req.json();
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check and spend tokens
    const { data: tokenResult, error: tokenError } = await supabase.rpc('spend_tokens', {
      user_id_param: userId,
      tokens_amount: 1
    });

    if (tokenError) {
      console.error('Token spending error:', tokenError);
      throw new Error('Ошибка при списании токенов');
    }

    if (!tokenResult) {
      return new Response(JSON.stringify({ 
        error: 'Недостаточно токенов для генерации' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build the prompt
    const competitorLinks = competitors.filter(Boolean).join(', ');
    const keywordsList = keywords.join(', ');
    
    const prompt = `Ты в роли менеджера маркетплейсов со знанием SEO и продвижением карточек. Твоя задача сделать красивое уникальное описание товара с использованием ключевых слов, чтобы мой товар ранжировался по всем ним. Мой товар называется: ${productName}, и входит в категорию ${category}, вот ссылка на товары моих конкурентов, зайди в описание на карточки и выяви по каким ключевым словам они продвигаются ${competitorLinks}, также обязательно учти ключевые слова при генерации описания карточки товара, которые нужно учесть: ${keywordsList}. Требования: Описание карточки товара должно быть до 2000 символов с учетом пробелов, должно быть вовлекающим и содержать ключевые слова, которые я описал тебе и которые ты собрал от конкурентов, учти, что перемена слов местами и падежи - это относится к разным категориям ключевых слов и нужно их учитывать при генерации описания.`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedDescription = data.choices[0].message.content;

    // Save generation to database
    const { error: saveError } = await supabase
      .from('generations')
      .insert({
        user_id: userId,
        generation_type: 'description',
        input_data: {
          productName,
          category,
          competitors: competitors.filter(Boolean),
          keywords
        },
        output_data: {
          description: generatedDescription
        },
        tokens_used: 1,
        status: 'completed',
        product_name: productName,
        category: category,
        keywords: keywords,
        competitors: competitors.filter(Boolean)
      });

    if (saveError) {
      console.error('Error saving generation:', saveError);
    }

    return new Response(JSON.stringify({ 
      description: generatedDescription 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-description function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Произошла ошибка при генерации описания' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});