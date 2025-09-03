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

Правила композиции:
• Вертикальный формат 1024×1536 (3:4).
• Товар должен быть в центре внимания, но показан в естественной среде использования.
• Человек может быть в кадре, но товар — главный герой.
• Освещение естественное, атмосферное.

English helper:
• Lifestyle shot showing the product in natural use context.
• Product should be the main focus but shown in realistic environment.
• Natural lighting, authentic atmosphere, 1024×1536.`,

  macro: (productName: string, category: string, benefits: string) =>
    `Роль: Ты — продуктовый фотограф. Создай макросъёмку товара, показывающую качество и детали.

Данные:
• Товар: ${productName}
• Категория: ${category}
• Главные преимущества: ${benefits}

Правила съёмки:
• Вертикальный формат 1024×1536.
• Крупный план важных деталей товара (фактура, швы, материал).
• Резкость на переднем плане, мягкое размытие фона.
• Подчеркнуть качество изготовления.

English helper:
• Macro shot focusing on product details and quality.
• Sharp foreground, soft background blur.
• Emphasize craftsmanship and materials, 1024×1536.`,

  beforeAfter: (productName: string, category: string, benefits: string) =>
    `Роль: Ты — маркетинговый дизайнер. Создай изображение "до и после" использования товара.

Данные:
• Товар: ${productName}
• Категория: ${category}
• Главные преимущества: ${benefits}

Правила композиции:
• Вертикальный формат 1024×1536.
• Разделение на две части: "до" и "после".
• Четкий контраст, показывающий эффект от использования.
• Минимум текста: "ДО" и "ПОСЛЕ".

English helper:
• Before/after comparison showing product benefits.
• Split composition with clear contrast.
• Minimal text labels, 1024×1536.`,

  bundle: (productName: string, category: string, benefits: string) =>
    `Роль: Ты — коммерческий фотограф. Создай изображение товара в комплекте с аксессуарами.

Данные:
• Товар: ${productName}
• Категория: ${category}
• Главные преимущества: ${benefits}

Правила композиции:
• Вертикальный формат 1024×1536.
• Основной товар + дополнительные элементы/аксессуары.
• Гармоничная композиция, все элементы дополняют друг друга.
• Студийное освещение.

English helper:
• Product bundle with complementary accessories.
• Harmonious composition, studio lighting.
• Main product prominently featured, 1024×1536.`,

  guarantee: (productName: string, category: string, benefits: string) =>
    `Роль: Ты — дизайнер доверия. Создай изображение, подчёркивающее надёжность и гарантии товара.

Данные:
• Товар: ${productName}
• Категория: ${category}
• Главные преимущества: ${benefits}

Правила композиции:
• Вертикальный формат 1024×1536.
• Товар на чистом фоне с элементами доверия (сертификаты, знаки качества).
• Профессиональная съёмка, внушающая доверие.
• Возможны элементы текста о гарантии.

English helper:
• Trust-building product shot with quality indicators.
• Clean background, professional presentation.
• Guarantee/quality elements, 1024×1536.`
};

const MAX_CONCURRENT_TASKS = 2;
const MAX_RETRY_COUNT = 3;
const RETRY_BASE_DELAY = 60; // Base delay in seconds

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY not found');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestBody = await req.json();
    const { jobId } = requestBody;

    if (!jobId) {
      return new Response(JSON.stringify({ error: 'jobId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('generation_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error('Job not found:', jobError);
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark job as processing
    await supabase
      .from('generation_jobs')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', jobId);

    // Process tasks in background
    EdgeRuntime.waitUntil(processTasks(supabase, openAIApiKey, job));

    return new Response(JSON.stringify({
      success: true,
      message: 'Background processing started'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in process-generation-tasks function:', error);
    
    return new Response(JSON.stringify({
      error: error.message || 'Processing error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processTasks(supabase: any, openAIApiKey: string, job: any) {
  try {
    console.log(`Starting background processing for job ${job.id}`);

    while (true) {
      // Get ready tasks (pending or retrying with expired retry_after)
      const now = Math.floor(Date.now() / 1000);
      const { data: tasks, error: tasksError } = await supabase
        .from('generation_tasks')
        .select('*')
        .eq('job_id', job.id)
        .in('status', ['pending', 'retrying'])
        .or(`retry_after.is.null,retry_after.lt.${now}`)
        .order('created_at')
        .limit(MAX_CONCURRENT_TASKS);

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        break;
      }

      if (!tasks || tasks.length === 0) {
        // Check if all tasks are completed or failed
        const { data: allTasks, error: allTasksError } = await supabase
          .from('generation_tasks')
          .select('status')
          .eq('job_id', job.id);

        if (allTasksError) {
          console.error('Error checking all tasks:', allTasksError);
          break;
        }

        const pendingTasks = allTasks?.filter(t => 
          t.status === 'pending' || t.status === 'processing' || t.status === 'retrying'
        );

        if (!pendingTasks || pendingTasks.length === 0) {
          console.log(`All tasks completed for job ${job.id}`);
          break;
        }

        // Wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      // Process tasks concurrently
      const taskPromises = tasks.map(task => processTask(supabase, openAIApiKey, job, task));
      await Promise.allSettled(taskPromises);
    }

    console.log(`Background processing completed for job ${job.id}`);

  } catch (error) {
    console.error(`Error in background processing for job ${job.id}:`, error);
  }
}

async function processTask(supabase: any, openAIApiKey: string, job: any, task: any) {
  try {
    console.log(`Processing task ${task.id} (card ${task.card_index})`);

    // Mark task as processing
    await supabase
      .from('generation_tasks')
      .update({ 
        status: 'processing', 
        started_at: new Date().toISOString() 
      })
      .eq('id', task.id);

    // Generate prompt
    const promptTemplate = CARD_PROMPTS[task.card_type];
    if (!promptTemplate) {
      throw new Error(`Unknown card type: ${task.card_type}`);
    }

    const prompt = promptTemplate(job.product_name, job.category, job.description);

    // Update task with prompt
    await supabase
      .from('generation_tasks')
      .update({ prompt })
      .eq('id', task.id);

    // Generate image with OpenAI
    const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: prompt,
        n: 1,
        size: '1024x1536',
        quality: 'high',
        output_format: 'png'
      }),
    });

    if (!imageResponse.ok) {
      const errorData = await imageResponse.json();
      console.error(`OpenAI API error for task ${task.id}:`, errorData);

      // Handle rate limit
      if (imageResponse.status === 429) {
        const retryAfter = parseInt(imageResponse.headers.get('retry-after') || '60');
        const jitter = Math.floor(Math.random() * 10); // Add jitter
        const retryDelay = retryAfter + jitter;

        console.log(`Rate limited for task ${task.id}, retrying after ${retryDelay} seconds`);

        if (task.retry_count < MAX_RETRY_COUNT) {
          await supabase
            .from('generation_tasks')
            .update({ 
              status: 'retrying',
              retry_count: task.retry_count + 1,
              retry_after: Math.floor(Date.now() / 1000) + retryDelay,
              last_error: errorData.error?.message || 'Rate limit exceeded'
            })
            .eq('id', task.id);
          return;
        }
      }

      throw new Error(errorData.error?.message || 'OpenAI API error');
    }

    const imageData = await imageResponse.json();
    const imageUrl = imageData.data[0].url;

    // Download and upload to Supabase Storage
    const imageBuffer = await fetch(imageUrl).then(r => r.arrayBuffer());
    const fileName = `${job.id}/${task.card_index}_${task.card_type}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from('generated-cards')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Upload error: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('generated-cards')
      .getPublicUrl(fileName);

    // Mark task as completed
    await supabase
      .from('generation_tasks')
      .update({ 
        status: 'completed',
        image_url: publicUrl,
        storage_path: fileName,
        completed_at: new Date().toISOString()
      })
      .eq('id', task.id);

    console.log(`Task ${task.id} completed successfully`);

  } catch (error: any) {
    console.error(`Task ${task.id} error:`, error);

    // Mark task as failed if max retries exceeded
    if (task.retry_count >= MAX_RETRY_COUNT) {
      await supabase
        .from('generation_tasks')
        .update({ 
          status: 'failed',
          last_error: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', task.id);
    } else {
      // Retry with exponential backoff
      const retryDelay = RETRY_BASE_DELAY * Math.pow(2, task.retry_count);
      await supabase
        .from('generation_tasks')
        .update({ 
          status: 'retrying',
          retry_count: task.retry_count + 1,
          retry_after: Math.floor(Date.now() / 1000) + retryDelay,
          last_error: error.message
        })
        .eq('id', task.id);
    }
  }
}