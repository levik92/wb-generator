import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_RETRIES = 3;

const IMAGE_FETCH_TIMEOUT_MS = 60_000;
// Практика показала, что очень большие референсы могут приводить к падению Edge Runtime (546).
// Ограничиваем размер, чтобы вместо падения дать понятную деградацию (пропустить референс).
const MAX_IMAGE_BYTES = 3_000_000; // ~3MB

type FetchImageResult =
  | { ok: true; base64: string; bytes: number; mimeType: string }
  | { ok: false; reason: string };

async function fetchImageAsBase64(url: string): Promise<FetchImageResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      return { ok: false, reason: `download_failed:${res.status}` };
    }

    const mimeType = res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg';
    const contentLengthHeader = res.headers.get('content-length');
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : null;

    if (contentLength !== null && Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
      return { ok: false, reason: `too_large:${contentLength}` };
    }

    if (!res.body) {
      // fallback: arrayBuffer (редко, но бывает)
      const buf = await res.arrayBuffer();
      if (buf.byteLength > MAX_IMAGE_BYTES) return { ok: false, reason: `too_large:${buf.byteLength}` };
      const base64 = base64Encode(new Uint8Array(buf));
      return { ok: true, base64, bytes: buf.byteLength, mimeType };
    }

    // stream read with hard cap
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;

      received += value.byteLength;
      if (received > MAX_IMAGE_BYTES) {
        try {
          await reader.cancel();
        } catch (_) {
          // ignore
        }
        return { ok: false, reason: `too_large:${received}` };
      }

      chunks.push(value);
    }

    const merged = new Uint8Array(received);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.byteLength;
    }

    const base64 = base64Encode(merged);
    return { ok: true, base64, bytes: received, mimeType };
  } catch (e) {
    const msg = (e as any)?.name === 'AbortError' ? 'timeout' : ((e as any)?.message || 'unknown');
    return { ok: false, reason: msg };
  } finally {
    clearTimeout(timeoutId);
  }
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
    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');

    if (!geminiApiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get task details
    const { data: task, error: taskError } = await supabase
      .from('generation_tasks')
      .select('*, job:generation_jobs(*)')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      console.error('Task not found:', taskError?.message || 'No task data');
      return new Response(
        JSON.stringify({ error: 'Task not found', details: taskError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!task.job) {
      console.error('Job not found for task:', taskId);
      return new Response(
        JSON.stringify({ error: 'Job not found for task' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jobImages = task.job.product_images as Array<{ url: string; name?: string; type?: string }> || [];
    
    if (!jobImages || jobImages.length === 0) {
      console.error('No images in job data');
      await supabase
        .from('generation_tasks')
        .update({
          status: 'failed',
          last_error: 'Не найдены изображения в задании.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);
      
      return new Response(
        JSON.stringify({ error: 'No images in job data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const retryCount = task.retry_count || 0;
    console.log(`Processing task ${taskId}, retry ${retryCount}/${MAX_RETRIES}`);

    // Separate product images from reference
    const productImages = jobImages.filter(img => img.type !== 'reference');
    const referenceImage = jobImages.find(img => img.type === 'reference');

    console.log(`Found ${productImages.length} product images and ${referenceImage ? 1 : 0} reference in job data`);

    // Validate we have at least one product image source
    if (productImages.length === 0) {
      console.error('No product images found in job data');
      await supabase
        .from('generation_tasks')
        .update({
          status: 'failed',
          last_error: 'Не найдены изображения товара для генерации.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);
      
      return new Response(
        JSON.stringify({ error: 'No product images found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download product images as base64 (size-limited)
    const productImageBase64: Array<{ base64: string; mimeType: string; bytes: number }> = [];
    for (const img of productImages) {
      console.log(`Downloading product image: ${img.url?.substring(0, 100)}...`);
      const r = await fetchImageAsBase64(img.url);
      if (!r.ok) {
        console.warn(`Product image skipped (${r.reason}): ${img.url}`);
        continue;
      }
      productImageBase64.push({ base64: r.base64, mimeType: r.mimeType, bytes: r.bytes });
      console.log(`Successfully downloaded product image (${r.bytes} bytes)`);
    }

    // Validate we have at least one successfully downloaded product image
    if (productImageBase64.length === 0) {
      console.error('Failed to download any product images');
      await supabase
        .from('generation_tasks')
        .update({
          status: 'failed',
          last_error: 'Не удалось загрузить изображения товара. Проверьте доступность файлов.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      return new Response(
        JSON.stringify({ error: 'Failed to download product images' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download reference (optional). If it's too large/slow, skip it to avoid Edge crash.
    let referenceBase64: { base64: string; mimeType: string; bytes: number } | null = null;
    if (referenceImage?.url) {
      console.log(`Downloading reference image: ${referenceImage.url?.substring(0, 100)}...`);
      const r = await fetchImageAsBase64(referenceImage.url);
      if (!r.ok) {
        console.warn(`Reference image skipped (${r.reason}): ${referenceImage.url}`);
        referenceBase64 = null;
      } else {
        referenceBase64 = { base64: r.base64, mimeType: r.mimeType, bytes: r.bytes };
        console.log(`Successfully downloaded reference image (${r.bytes} bytes)`);
      }
    }

    console.log(`Processing with ${productImageBase64.length} product images${referenceBase64 ? ' and 1 reference' : ''}`);

    // Build content parts for Google Gemini API format
    const contentParts: any[] = [];
    
    // Add structured instruction at the beginning
    const structuredInstruction = `ВАЖНАЯ ИНФОРМАЦИЯ О СТРУКТУРЕ ИЗОБРАЖЕНИЙ:

Я отправляю тебе ${productImageBase64.length + (referenceBase64 ? 1 : 0)} изображений в следующем порядке:

ФОТОГРАФИИ ТОВАРА (используй эти изображения для создания карточки):
${productImageBase64.map((_, index) => `• Изображение ${index + 1}: ФОТО ТОВАРА - основа для создания карточки`).join('\n')}
${referenceBase64 ? `\nРЕФЕРЕНС ДИЗАЙНА (используй только как пример стиля оформления):\n• Изображение ${productImageBase64.length + 1}: РЕФЕРЕНС - ориентируйся на СТИЛЬ, КОМПОЗИЦИЮ и ОФОРМЛЕНИЕ этой карточки. ТОВАР бери ТОЛЬКО из предыдущих изображений товара, НЕ копируй товар с референса!` : ''}

ТВОЯ ЗАДАЧА:
${prompt}

КРИТИЧЕСКИ ВАЖНО:
1. Товар для карточки бери ТОЛЬКО из первых ${productImageBase64.length} изображений (фото товара)
${referenceBase64 ? `2. Последнее изображение (референс) используй ТОЛЬКО для понимания стиля оформления, но НЕ копируй сам товар\n3. Создай новую карточку с товаром из фото товара в стиле референса` : '2. Создай профессиональную маркетинговую карточку товара'}

ОБЯЗАТЕЛЬНО: Верни сгенерированное ИЗОБРАЖЕНИЕ карточки товара.`;

    contentParts.push({ text: structuredInstruction });

    // Add all product images
    for (const img of productImageBase64) {
      contentParts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.base64,
        },
      });
    }

    // Add reference image if exists (always last)
    if (referenceBase64) {
      contentParts.push({
        inlineData: {
          mimeType: referenceBase64.mimeType,
          data: referenceBase64.base64,
        },
      });
    }

    console.log('Calling Google Gemini 3 Pro Image API for image generation...');

    // Call Google Gemini 3 Pro Image API directly
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: contentParts
        }]
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Google Gemini 3 Pro Image API error:', aiResponse.status, errorText);

      // Handle rate limit or quota exceeded
      if (aiResponse.status === 429 || aiResponse.status === 403) {
        if (retryCount < MAX_RETRIES) {
          const retryDelay = Math.pow(2, retryCount) * 5000;
          await supabase
            .from('generation_tasks')
            .update({
              status: 'retrying',
              retry_count: retryCount + 1,
              retry_after: retryDelay,
              last_error: 'API quota exceeded, will retry',
              updated_at: new Date().toISOString(),
            })
            .eq('id', taskId);

          return new Response(
            JSON.stringify({ message: 'Task will retry', retryAfter: retryDelay }),
            { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        await supabase
          .from('generation_tasks')
          .update({
            status: 'failed',
            last_error: 'Превышена квота API. Попробуйте позже.',
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskId);

        throw new Error('Quota exceeded');
      }

      // Handle bad request
      if (aiResponse.status === 400) {
        await supabase
          .from('generation_tasks')
          .update({
            status: 'failed',
            last_error: 'Некорректный запрос к API.',
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskId);

        throw new Error(`Bad request: ${errorText}`);
      }

      throw new Error(`Google Gemini 3 Pro Image API error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response received:', JSON.stringify(aiData).substring(0, 200));
    
    // Parse Google Gemini response format
    const generatedImageBase64 = aiData.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData)?.inlineData?.data;

    if (!generatedImageBase64) {
      console.error('No image in response:', JSON.stringify(aiData));
      throw new Error('No image generated by Google Gemini 3 Pro Image');
    }

    // Convert base64 to blob for storage
    const imageBlob = Uint8Array.from(atob(generatedImageBase64), c => c.charCodeAt(0));

    // Upload to Supabase Storage
    const fileName = `${task.job.user_id}/${task.job_id}/${task.card_index}_${task.card_type}.png`;
    const { error: uploadError } = await supabase.storage
      .from('generated-cards')
      .upload(fileName, imageBlob, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to upload generated image');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('generated-cards')
      .getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL');
    }

    // Update task as completed
    await supabase
      .from('generation_tasks')
      .update({
        status: 'completed',
        image_url: urlData.publicUrl,
        storage_path: fileName,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    // Update job progress
    await supabase.rpc('update_job_progress', { job_id_param: task.job_id });

    console.log(`Task ${taskId} completed successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: urlData.publicUrl,
        storagePath: fileName,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-google-task:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
