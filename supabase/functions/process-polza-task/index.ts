import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const POLZA_BASE_URL = 'https://polza.ai/api/v1';
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_TIME_MS = 5 * 60 * 1000; // 5 minutes

function calcRefundTokensForTask(job: any): number {
  const tokensCost = Number(job?.tokens_cost ?? 1);
  const totalCards = Number(job?.total_cards ?? 1);
  if (!Number.isFinite(tokensCost) || tokensCost <= 0) return 1;
  if (!Number.isFinite(totalCards) || totalCards <= 0) return Math.max(1, Math.round(tokensCost));
  return Math.max(1, Math.round(tokensCost / totalCards));
}

async function pollMediaStatus(polzaApiKey: string, generationId: string): Promise<any> {
  const startTime = Date.now();
  while (Date.now() - startTime < MAX_POLL_TIME_MS) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    
    const resp = await fetch(`${POLZA_BASE_URL}/media/${generationId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${polzaApiKey}` },
    });

    if (!resp.ok) {
      console.error(`[process-polza-task] Poll error: ${resp.status}`);
      continue;
    }

    const result = await resp.json();
    console.log(`[process-polza-task] Poll status: ${result.status}`);

    if (result.status === 'completed') {
      return result;
    }
    if (result.status === 'failed' || result.status === 'cancelled') {
      throw new Error(result.error?.message || 'Polza media generation failed');
    }
  }
  throw new Error('Polza media generation timed out');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { taskId, sourceImageUrl, prompt } = await req.json();

    if (!taskId || !sourceImageUrl || !prompt) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
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

    // Get task details
    const { data: task, error: taskError } = await supabase
      .from('generation_tasks')
      .select('*, job:generation_jobs(*)')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return new Response(
        JSON.stringify({ error: 'Task not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!task.job) {
      return new Response(
        JSON.stringify({ error: 'Job not found for task' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jobImages = task.job.product_images as Array<{ url: string; name?: string; type?: string }> || [];
    const productImages = jobImages.filter(img => img.type !== 'reference');
    const referenceImage = jobImages.find(img => img.type === 'reference');

    if (productImages.length === 0) {
      await supabase
        .from('generation_tasks')
        .update({ status: 'failed', last_error: 'Не найдены изображения товара.', updated_at: new Date().toISOString() })
        .eq('id', taskId);
      return new Response(
        JSON.stringify({ error: 'No product images found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get image resolution
    const { data: modelSettings } = await supabase
      .from('ai_model_settings')
      .select('image_resolution')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const imageResolution = modelSettings?.image_resolution || '2K';

    console.log(`[process-polza-task] Processing task ${taskId} via Polza API, resolution: ${imageResolution}`);

    // Build images array for Polza Media API - use URLs directly (no base64 needed!)
    const inputImages: Array<{type: string; data: string}> = [];
    for (const img of productImages) {
      inputImages.push({ type: 'url', data: img.url });
    }
    if (referenceImage?.url) {
      inputImages.push({ type: 'url', data: referenceImage.url });
    }

    // Build the full prompt with image structure instructions
    const structuredPrompt = `ВАЖНАЯ ИНФОРМАЦИЯ О СТРУКТУРЕ ИЗОБРАЖЕНИЙ:

Я отправляю тебе ${productImages.length + (referenceImage ? 1 : 0)} изображений в следующем порядке:

ФОТОГРАФИИ ТОВАРА (используй эти изображения для создания карточки):
${productImages.map((_, index) => `• Изображение ${index + 1}: ФОТО ТОВАРА - основа для создания карточки`).join('\n')}
${referenceImage ? `\nРЕФЕРЕНС ДИЗАЙНА (используй только как пример стиля оформления):\n• Изображение ${productImages.length + 1}: РЕФЕРЕНС - ориентируйся на СТИЛЬ, КОМПОЗИЦИЮ и ОФОРМЛЕНИЕ этой карточки. ТОВАР бери ТОЛЬКО из предыдущих изображений товара, НЕ копируй товар с референса!` : ''}

ТВОЯ ЗАДАЧА:
${prompt}

КРИТИЧЕСКИ ВАЖНО:
1. Товар для карточки бери ТОЛЬКО из первых ${productImages.length} изображений (фото товара)
${referenceImage ? `2. Последнее изображение (референс) используй ТОЛЬКО для понимания стиля оформления, но НЕ копируй сам товар\n3. Создай новую карточку с товаром из фото товара в стиле референса` : '2. Создай профессиональную маркетинговую карточку товара'}

ОБЯЗАТЕЛЬНО: Верни сгенерированное ИЗОБРАЖЕНИЕ карточки товара.`;

    // Call Polza Media API
    const mediaResponse = await fetch(`${POLZA_BASE_URL}/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${polzaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        input: {
          prompt: structuredPrompt,
          images: inputImages,
          aspect_ratio: '3:4',
          image_resolution: imageResolution,
        },
      }),
    });

    if (!mediaResponse.ok) {
      const errorText = await mediaResponse.text();
      console.error(`[process-polza-task] Polza API error: ${mediaResponse.status}`, errorText);

      const failMessage = mediaResponse.status === 402
        ? 'Недостаточно средств на балансе Polza AI'
        : 'Ошибка генерации через Polza AI. Попробуйте позже.';

      await supabase
        .from('generation_tasks')
        .update({ status: 'failed', last_error: `polza_${mediaResponse.status}`, updated_at: new Date().toISOString() })
        .eq('id', taskId);

      const tokensToRefund = calcRefundTokensForTask(task.job);
      await supabase.rpc('refund_tokens', {
        user_id_param: task.job.user_id,
        tokens_amount: tokensToRefund,
        reason_text: `Возврат за ошибку Polza API: ${failMessage}`
      });

      await supabase.from('notifications').insert({
        user_id: task.job.user_id,
        type: 'error',
        title: 'Ошибка генерации',
        message: `Не удалось сгенерировать карточку "${task.job.product_name}". ${failMessage} Токены возвращены на баланс.`
      });

      return new Response(
        JSON.stringify({ success: false, handled: true, error: failMessage }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mediaResult = await mediaResponse.json();
    console.log(`[process-polza-task] Media created: ${mediaResult.id}, status: ${mediaResult.status}`);

    // If already completed (synchronous response)
    let finalResult = mediaResult;
    if (mediaResult.status === 'pending' || mediaResult.status === 'processing') {
      // Poll for completion
      finalResult = await pollMediaStatus(polzaApiKey, mediaResult.id);
    }

    // Extract image URL from response
    // data can be a URL string, an array of URLs, or an object with url field
    let imageUrl: string | null = null;
    if (typeof finalResult.data === 'string') {
      imageUrl = finalResult.data;
    } else if (Array.isArray(finalResult.data) && finalResult.data.length > 0) {
      const firstItem = finalResult.data[0];
      imageUrl = typeof firstItem === 'string' ? firstItem : firstItem?.url || firstItem?.b64_json || null;
    } else if (finalResult.data?.url) {
      imageUrl = finalResult.data.url;
    }

    if (!imageUrl) {
      console.error('[process-polza-task] No image URL in response:', JSON.stringify(finalResult));
      throw new Error('No image generated by Polza');
    }

    console.log(`[process-polza-task] Got image URL from Polza: ${imageUrl.substring(0, 80)}...`);

    // Download from Polza CDN and upload to Supabase Storage
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) {
      throw new Error(`Failed to download image from Polza CDN: ${imgResponse.status}`);
    }

    const imgBuffer = await imgResponse.arrayBuffer();
    const imgBytes = new Uint8Array(imgBuffer);
    const contentType = imgResponse.headers.get('content-type')?.split(';')[0]?.trim() || 'image/png';
    const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';

    const storagePath = `generated/${task.job.user_id}/${task.job_id}/${taskId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('generation-results')
      .upload(storagePath, imgBytes, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[process-polza-task] Upload error:', uploadError);
      throw new Error('Failed to upload to storage');
    }

    const { data: { publicUrl } } = supabase.storage
      .from('generation-results')
      .getPublicUrl(storagePath);

    // Update task as completed
    await supabase
      .from('generation_tasks')
      .update({
        status: 'completed',
        image_url: publicUrl,
        storage_path: storagePath,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    // Update job completed count
    await supabase.rpc('increment_completed_cards', { job_id_param: task.job_id });

    console.log(`[process-polza-task] Task ${taskId} completed successfully via Polza`);

    return new Response(
      JSON.stringify({ success: true, imageUrl: publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[process-polza-task] Error:', error);

    // Try to mark task as failed
    try {
      const { taskId } = await new Response(null).json().catch(() => ({}));
    } catch (_) {}

    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
