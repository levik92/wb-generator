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
    const { productName, category, competitors, keywords, userId } = requestBody;

    // Input validation with expanded limits for more robust validation
    if (!productName || typeof productName !== 'string' || productName.length > 200) {
      return new Response(JSON.stringify({ error: 'Invalid product name (max 200 characters)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!category || typeof category !== 'string' || category.length > 100) {
      return new Response(JSON.stringify({ error: 'Invalid category (max 100 characters)' }), {
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

    // Sanitize inputs to prevent injection attacks  
    const sanitizedProductName = productName.replace(/[<>\"']/g, '').trim();
    const sanitizedCategory = category.replace(/[<>\"']/g, '').trim();

    // Sanitize and validate competitors array with additional security
    const sanitizedCompetitors = Array.isArray(competitors) 
      ? competitors.slice(0, 10)
          .filter(c => typeof c === 'string' && c.length <= 500)
          .map(c => c.replace(/[<>\"']/g, '').trim())
          .filter(c => c.length > 0)
      : [];

    // Sanitize and validate keywords array with additional security  
    const sanitizedKeywords = Array.isArray(keywords)
      ? keywords.slice(0, 20)
          .filter(k => typeof k === 'string' && k.length <= 100)
          .map(k => k.replace(/[<>\"']/g, '').trim())
          .filter(k => k.length > 0)
      : [];

    // Enhanced content filtering for harmful prompts
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

    // Build the prompt with sanitized data
    const competitorText = sanitizedCompetitors.length > 0 
      ? `\n\nАнализ конкурентов:\n${sanitizedCompetitors.map((comp: string, index: number) => `${index + 1}. ${comp}`).join('\n')}`
      : '';

    const keywordText = sanitizedKeywords.length > 0 
      ? `\n\nКлючевые слова для SEO: ${sanitizedKeywords.join(', ')}`
      : '';
    
    const prompt = `Ты в роли менеджера маркетплейсов со знанием SEO и продвижением карточек. Твоя задача сделать красивое уникальное описание товара с использованием ключевых слов, чтобы мой товар ранжировался по всем ним. Мой товар называется: ${sanitizedProductName}, и входит в категорию ${sanitizedCategory}${competitorText}${keywordText}. Требования: Описание карточки товара должно быть до 2000 символов с учетом пробелов, должно быть вовлекающим и содержать ключевые слова, которые я описал тебе и которые ты собрал от конкурентов, учти, что перемена слов местами и падежи - это относится к разным категориям ключевых слов и нужно их учитывать при генерации описания.`;

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
          productName: sanitizedProductName,
          category: sanitizedCategory,
          competitors: sanitizedCompetitors,
          keywords: sanitizedKeywords
        },
        output_data: {
          description: generatedDescription
        },
        tokens_used: 1,
        status: 'completed',
        product_name: sanitizedProductName,
        category: sanitizedCategory,
        keywords: sanitizedKeywords,
        competitors: sanitizedCompetitors
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