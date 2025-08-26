import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CARD_PROMPTS = {
  cover: (productName: string, category: string, benefits: string) => 
    `Роль: Ты — профессиональный UX/UI-дизайнер и арт-директор маркетплейс-контента. 
Твоя задача — создать коммерческое обложечное изображение для карточки товара.

Данные:
• Товар: ${productName}
• Категория: ${category}
• Главные преимущества: ${benefits}

Правила по продукту:
• На итоговом изображении товар должен быть показан полностью, крупным планом, с высокой читаемостью.  
• Все мелкие детали (швы, фурнитура, бирки, фактура, логотипы) должны быть сохранены без изменений.  
• Если товар — одежда и среди фото нет снимка на модели, можно показать ЭТУ ЖЕ одежду на модели, но строго сохранив крой, длину и посадку.  
• Недопустимы стилизации, упрощения или «улучшения», искажающие товар.  

Композиция:
• Вертикальный кадр (3:4, целевой размер 1024×1536).  
• Товар в центре, на переднем плане, максимально читаемый, не обрезанный.  
• Фон допускается студийный (чистый) или нейтральный контекст применения.  
• Фон и окружение должны подчёркивать товар, но не отвлекать от него.  
• Свет мягкий, аккуратный, цветопередача точная, как на исходных фото.  

Отображение преимуществ:
• Можно добавить одно короткое преимущество в виде читаемого заголовка.  
• Текст — крупный, лаконичный, контрастный.  
• Допускается минимальная иконка/плашка для визуализации (например «10 лет гарантии»).  
• Запрещено накладывать текст друг на друга или на сам товар.  

Технические требования:
• Итоговое изображение должно быть фотореалистичным, высокого качества.  
• Запрещены водяные знаки, посторонние надписи, декоративные элементы.  
• Формат: вертикаль 1024×1536 (последующая обрезка до 960×1280).

English helper:
• Show the product fully, centered, and clear.  
• One short headline with a key benefit is optional, must be readable and not overlap the product.  
• Photorealistic, commercial e-commerce style, 1024×1536.`,

  lifestyle: (productName: string, category: string, benefits: string) =>
    `Роль: Ты — арт-директор e-commerce. Создай реалистичное изображение товара в контексте применения (lifestyle).

Данные:
• Товар: ${productName}
• Категория: ${category}
• Главные преимущества: ${benefits}

Правила по продукту:
• Товар должен соответствовать прикреплённым фото на 100% (форма, пропорции, материалы, цвет, детали, логотипы, швы/фурнитура).
• Товар должен быть хорошо виден и не перекрыт окружением.
• Если это одежда и нет фото на модели — допускается показать ЭТУ ЖЕ одежду на модели без изменения кроя/длины/посадки.

Композиция:
• Вертикаль 3:4 (целевой рендер 1024×1536).
• Реалистичная сцена использования (уместное окружение, свет, тени).
• Фон подчёркивает товар и не отвлекает; цветопередача точная, как на прикреплённых фото.

Отображение преимуществ:
• Одно короткое преимущество можно визуализировать мини-плашкой/иконкой сбоку (не закрывая товар).
• Текст крупный, контрастный, без наложений друг на друга или на товар.

Технические требования:
• Фотореализм, коммерческий стиль. Без водяных знаков/чужих брендов.
• Нельзя добавлять элементы, которых нет у товара, и нельзя «улучшать» его внешний вид.`,

  macro: (productName: string, category: string, details: string) =>
    `Роль: Ты — предметный фотограф. Создай макро-изображение ключевых деталей товара.

Данные:
• Товар: ${productName}
• Категория: ${category}
• Ключевые детали/материалы: ${details}

Правила по продукту:
• Точная передача фактуры, швов, фурнитуры, принтов, логотипов; никакой модификации.
• Нельзя искажать масштаб деталей; сохраняй реальные пропорции.

Композиция:
• Вертикаль 3:4 (целевой 1024×1536).
• Крупный план 1–2 узловых зон (макро). Резкость высокая, мягкий свет.
• Нейтральный фон/окружение, чтобы внимание было на деталях.

Отображение преимуществ:
• Допускается короткий подпункт (1 строка) как плашка-лейбл рядом с зоной детали (например «Прочная молния YKK» или «Натуральная кожа»).
• Текст крупный, читаемый, не перекрывает саму деталь, без наложений.

Технические требования:
• Фотореализм, аккуратная цветопередача согласно прикреплённым фото.
• Без водяных знаков, без декоративных элементов, которых нет в реальном товаре.`,

  beforeAfter: (productName: string, category: string, effect: string) =>
    `Роль: Ты — e-commerce дизайнер. Покажи визуальную разницу «до/после» использования товара.

Данные:
• Товар: ${productName}
• Категория: ${category}
• Описанный эффект/выгода: ${effect}

Правила по продукту:
• Сам товар в блоке «после» должен соответствовать прикреплённым фото на 100% (никаких изменений формы/цвета/деталей).
• «До» — состояние без товара или без его эффекта; «После» — с товаром и результатом.

Композиция:
• Вертикаль 3:4 (целевой 1024×1536).
• Либо сплит-кадр (слева «до», справа «после»), либо последовательность сверху-вниз; свет и ракурс согласованы.
• Товар хорошо виден в части «после», ничего его не закрывает.

Отображение преимуществ:
• Одно ключевое преимущество — в виде краткого заголовка («После: +X% удобства», «Чисто и аккуратно» и т.п.).
• Текст крупный, контрастный, не пересекается с другими надписями и не перекрывает товар.

Технические требования:
• Фотореализм, коммерческий стиль; без посторонних брендов/водяных знаков.
• Никаких «улучшений» внешнего вида товара за пределами соответствия прикреплённым фото.`,

  bundle: (productName: string, category: string, components: string) =>
    `Роль: Ты — предметный стилист. Покажи всю комплектацию товара понятным плоским раскладом (flat-lay).

Данные:
• Товар: ${productName}
• Категория: ${category}
• Состав комплекта (штучно и по названиям): ${components}

Правила по продукту:
• Каждый элемент набора должен соответствовать реальному виду с прикреплённых фото (форма, пропорции, цвет, детали).
• Масштаб элементов правдоподобный и соотносится друг с другом.

Композиция:
• Вертикаль 3:4 (целевой 1024×1536).
• Плоский вид сверху (flat-lay), ровная сетка/аккуратная раскладка, равные отступы.
• Нейтральный фон, мягкие тени; ничто не перекрывает элементы.

Отображение преимуществ:
• Допустимы краткие подписи-лейблы к ключевым элементам (1–2 слова, не накладывать на сам предмет).
• Один короткий заголовок «Комплектация» допустим, шрифт крупный, контрастный, без пересечений.

Технические требования:
• Фотореализм, точная цветопередача. Без водяных знаков/чужих логотипов.
• Нельзя добавлять в набор того, чего нет в реальности.`,

  guarantee: (productName: string, category: string, warranties: string) =>
    `Роль: Ты — визуальный дизайнер маркетплейса. Создай имиджевое изображение с акцентом на доверие: гарантии, сертификаты, срок службы.

Данные:
• Товар: ${productName}
• Категория: ${category}
• Гарантии/метрики доверия: ${warranties}

Правила по продукту:
• Если товар присутствует в кадре — он должен соответствовать прикреплённым фото на 100% и быть хорошо видим.
• Недопустимо перекрывать товар плашками/текстами.

Композиция:
• Вертикаль 3:4 (целевой 1024×1536).
• Чистая премиальная композиция: товар (или часть товара) + аккуратные бейджи/иконки доверия.
• Мягкий свет, минимализм, читаемая иерархия.

Отображение преимуществ:
• Короткий заголовок (например: «Гарантия 10 лет»).
• 2–3 иконки/бейджа (сертификация, безопасные материалы, длительный срок службы) — неброско, без наложений друг на друга и на товар.
• Текст крупный и контрастный, без пересечений.

Технические требования:
• Фотореализм, коммерческий стиль; без водяных знаков/чужих брендов.
• Запрещены выдуманные регалии — используй только заявленные в данных.`
};

async function resizeImage(imageUrl: string): Promise<ArrayBuffer> {
  // Fetch the image
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  
  const imageData = await response.arrayBuffer();
  
  // For now, return the image as-is
  // In a real implementation, you would use an image processing library
  // to resize to 960x1280
  return imageData;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { 
      productName, 
      category, 
      description, 
      userId, 
      productImages = [],
      cardType = null,
      cardIndex = null 
    } = requestBody;

    // Input validation
    if (!productName || typeof productName !== 'string' || productName.length > 100) {
      return new Response(JSON.stringify({ error: 'Invalid product name' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!category || typeof category !== 'string' || category.length > 50) {
      return new Response(JSON.stringify({ error: 'Invalid category' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!description || typeof description !== 'string' || description.length > 2000) {
      return new Response(JSON.stringify({ error: 'Invalid description' }), {
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

    // Sanitize inputs
    const sanitizedProductName = productName.replace(/[<>\"']/g, '').trim();
    const sanitizedCategory = category.replace(/[<>\"']/g, '').trim();
    const sanitizedDescription = description.replace(/[<>\"']/g, '').trim();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determine if this is a single card regeneration or full set
    const isRegeneration = cardType && cardIndex !== null;
    const tokensNeeded = isRegeneration ? 1 : 6;

    // Check if user has enough tokens (without spending yet)
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('tokens_balance')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      throw new Error('Ошибка при проверке баланса токенов');
    }

    if (profileData.tokens_balance < tokensNeeded) {
      return new Response(JSON.stringify({ 
        error: 'Недостаточно токенов для генерации' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompts = {
      0: CARD_PROMPTS.cover(sanitizedProductName, sanitizedCategory, sanitizedDescription),
      1: CARD_PROMPTS.lifestyle(sanitizedProductName, sanitizedCategory, sanitizedDescription),
      2: CARD_PROMPTS.macro(sanitizedProductName, sanitizedCategory, sanitizedDescription),
      3: CARD_PROMPTS.beforeAfter(sanitizedProductName, sanitizedCategory, sanitizedDescription),
      4: CARD_PROMPTS.bundle(sanitizedProductName, sanitizedCategory, sanitizedDescription),
      5: CARD_PROMPTS.guarantee(sanitizedProductName, sanitizedCategory, sanitizedDescription),
    };

    const generatedImages = [];
    
    if (isRegeneration) {
      // Generate single card
      const prompt = prompts[cardIndex as keyof typeof prompts];
      
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-image-1',
          prompt: prompt,
          size: '1024x1536',
          quality: 'high',
          n: 1
        }),
      });

      const imageData = await response.json();
      
      if (!response.ok) {
        console.error(`OpenAI API error for card ${cardIndex}:`, JSON.stringify(imageData, null, 2));
        console.error(`Response status: ${response.status}, statusText: ${response.statusText}`);
        
        // Refund tokens if generation fails
        await supabase.rpc('refund_tokens', {
          user_id_param: userId,
          tokens_amount: tokensNeeded,
          reason_text: `Ошибка генерации карточки ${cardIndex}`
        });
        
        throw new Error(imageData.error?.message || `Failed to generate image: ${response.status}`);
      }

      if (!imageData.data || !imageData.data[0] || !imageData.data[0].b64_json) {
        console.error('Invalid OpenAI response format:', JSON.stringify(imageData, null, 2));
        throw new Error('Invalid response format from OpenAI API');
      }

      const imageBase64 = imageData.data[0].b64_json;
      
      // Convert base64 to ArrayBuffer
      const imageBuffer = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
      const fileName = `${userId}/${Date.now()}_card_${cardIndex}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('generated-cards')
        .upload(fileName, imageBuffer, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: true
        });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          
          // Refund tokens if upload fails
          await supabase.rpc('refund_tokens', {
            user_id_param: userId,
            tokens_amount: tokensNeeded,
            reason_text: 'Ошибка сохранения изображения'
          });
          
          throw new Error('Failed to save generated image');
        }

      const { data: publicUrl } = supabase.storage
        .from('generated-cards')
        .getPublicUrl(fileName);

      console.log(`Successfully generated and uploaded card ${cardIndex} for user ${userId}`);
      
    } else {
      // Generate all 6 cards in parallel
      const imagePromises = Object.entries(prompts).map(async ([index, prompt]) => {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
            body: JSON.stringify({
              model: 'gpt-image-1',
              prompt: prompt,
              size: '1024x1536',
              quality: 'high',
              n: 1
            }),
        });

        const imageData = await response.json();
        
        if (!response.ok) {
          console.error(`OpenAI API error for card ${index}:`, JSON.stringify(imageData, null, 2));
          console.error(`Response status: ${response.status}, statusText: ${response.statusText}`);
          throw new Error(imageData.error?.message || `Failed to generate card ${index}: ${response.status}`);
        }

        if (!imageData.data || !imageData.data[0] || !imageData.data[0].b64_json) {
          console.error(`Invalid OpenAI response format for card ${index}:`, JSON.stringify(imageData, null, 2));
          throw new Error(`Invalid response format from OpenAI API for card ${index}`);
        }

        const imageBase64 = imageData.data[0].b64_json;
        
        // Convert base64 to ArrayBuffer
        const imageBuffer = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
        const fileName = `${userId}/${Date.now()}_card_${index}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from('generated-cards')
          .upload(fileName, imageBuffer, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          console.error(`Upload error for card ${index}:`, uploadError);
          throw new Error(`Failed to save card ${index}`);
        }

        const { data: publicUrl } = supabase.storage
          .from('generated-cards')
          .getPublicUrl(fileName);

        console.log(`Successfully generated and uploaded card ${index} for user ${userId}`);
        
        return {
          index: parseInt(index),
          url: publicUrl.publicUrl
        };
      });

      const results = await Promise.all(imagePromises);
      results.sort((a, b) => a.index - b.index);
      generatedImages.push(...results.map(r => r.url));
    }

    // After successful generation of all images, spend the tokens
    const { data: tokenResult, error: tokenError } = await supabase.rpc('spend_tokens', {
      user_id_param: userId,
      tokens_amount: tokensNeeded
    });

    if (tokenError) {
      console.error('Token spending error:', tokenError);
      // If token spending fails after generation, we should still return success
      // since the images were generated successfully
    }

    // Save generation to database
    const { error: saveError } = await supabase
      .from('generations')
      .insert({
        user_id: userId,
        generation_type: 'product-cards',
        input_data: {
          productName: sanitizedProductName,
          category: sanitizedCategory,
          description: sanitizedDescription,
          productImages,
          cardType: isRegeneration ? cardType : 'full-set',
          cardIndex: cardIndex
        },
        output_data: {
          images: generatedImages,
          message: isRegeneration ? 
            `Карточка ${cardType} перегенерирована` : 
            'Карточки товара успешно созданы'
        },
        tokens_used: tokensNeeded,
        status: 'completed',
        product_name: sanitizedProductName,
        category: sanitizedCategory,
        description_requirements: sanitizedDescription
      });

    if (saveError) {
      console.error('Error saving generation:', saveError);
    }

    // Create notification
    const notificationTitle = isRegeneration ? 'Карточка обновлена!' : 'Карточки созданы!';
    const notificationMessage = isRegeneration ?
      `Карточка "${cardType}" для товара "${sanitizedProductName}" перегенерирована` :
      `Сгенерированы карточки для товара "${sanitizedProductName}" в категории "${sanitizedCategory}"`;

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: notificationTitle,
        message: notificationMessage,
        type: 'generation'
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: isRegeneration ? 
        `Карточка ${cardType} перегенерирована` : 
        'Карточки товара успешно созданы',
      images: generatedImages,
      isRegeneration,
      cardIndex
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-product-cards function:', error);
    
    // Refund tokens if any error occurred after token validation
    if (userId && error.message !== 'Недостаточно токенов для генерации') {
      try {
        const tokensNeeded = (cardType && cardIndex !== null) ? 1 : 6;
        await supabase.rpc('refund_tokens', {
          user_id_param: userId,
          tokens_amount: tokensNeeded,
          reason_text: 'Ошибка генерации - возврат токенов'
        });
        console.log(`Refunded ${tokensNeeded} tokens to user ${userId} due to generation error`);
      } catch (refundError) {
        console.error('Error refunding tokens:', refundError);
      }
    }

    return new Response(JSON.stringify({
      error: error.message || 'Произошла ошибка при генерации карточек'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});