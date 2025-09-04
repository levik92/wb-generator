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

    // Check if user has enough tokens before processing
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('tokens_balance')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error checking user balance:', profileError);
      throw new Error('Ошибка при проверке баланса токенов');
    }

    if (!profileData || profileData.tokens_balance < 1) {
      return new Response(JSON.stringify({ 
        error: 'Недостаточно токенов для генерации' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build the prompt with sanitized data
    const competitorText = sanitizedCompetitors.length > 0 
      ? `\n• Ссылки на конкурентов: ${sanitizedCompetitors.join(', ')}`
      : '';

    const keywordText = sanitizedKeywords.length > 0 
      ? `\n• Ключевые слова: ${sanitizedKeywords.join(', ')}`
      : '';
    
    const prompt = `Ты — SEO-копирайтер и маркетплейс-эксперт. 
Твоя цель — создать лучшее описание товара для маркетплейса (WB, Ozon), которое поможет карточке выйти в топ поисковой выдачи и увеличить продажи. 

Входные данные:
• Название товара: ${sanitizedProductName}
• Категория: ${sanitizedCategory}${competitorText}${keywordText}

Порядок действий:
1. Если есть ссылки на конкурентов - проанализируй их описания и собери ключевые слова.
2. Определи ключевые слова и словосочетания, которые конкуренты используют для продвижения.
3. Объедини их со списком ключевых слов пользователя.
Каждое ключевое слово и словосочетание должно быть использовано строго в том виде, как оно задано (все формы, склонения, порядок слов считаются отдельными ключами).
4. На основе объединённого списка составь уникальное, продающее и SEO-оптимизированное описание товара ${sanitizedProductName} в категории ${sanitizedCategory}.
5. Сделай так, чтобы описание выглядело максимально привлекательным для покупателей и при этом содержало все ключи, встроенные естественно.

Требования к описанию:
- Длина текста до 1800 символов (с пробелами).
- Текст уникальный, не копировать конкурента.
- Все ключевые слова (от конкурентов и пользователя) должны быть включены хотя бы один раз, без пропусков.
- Ключи распределить равномерно, чтобы не было «переспама».
- Акцент на преимуществах, выгодах, пользе и ценности товара.
- Тон: профессиональный, убедительный, коммерческий.
- Цель текста — вывести товар в топ выдачи по ключам и убедить покупателя оформить заказ.
- Запрещены смайлики, эмодзи и любые декоративные символы.
- Запрещено любое форматирование: отступы, абзацы, жирный, курсив, маркированные списки.
- На выходе выдать только готовое описание, без комментариев.`;

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
      const errorData = await response.json().catch(() => null);
      console.error('OpenAI API error:', response.status, errorData);
      
      if (response.status === 429) {
        throw new Error('Слишком много запросов к OpenAI API. Попробуйте через несколько минут.');
      } else if (response.status === 400 && errorData?.error?.code === 'billing_hard_limit_reached') {
        throw new Error('Достигнут лимит биллинга OpenAI API. Обратитесь в поддержку.');
      } else {
        throw new Error(`Ошибка OpenAI API: ${response.status}. Попробуйте позже.`);
      }
    }

    const data = await response.json();
    const generatedDescription = data.choices[0].message.content;

    // Only spend tokens after successful generation
    const { data: tokenResult, error: tokenError } = await supabase.rpc('spend_tokens', {
      user_id_param: userId,
      tokens_amount: 1
    });

    if (tokenError) {
      console.error('Token spending error after successful generation:', tokenError);
      // Still return the description even if token spending fails
      console.warn('Generated description successfully but failed to spend tokens');
    }

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