import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Delay before fallback to API2 (2 seconds)
const FALLBACK_DELAY_MS = 2000;
// Delay before final retry on API1 (10 seconds)
const FINAL_RETRY_DELAY_MS = 10000;

const IMAGE_FETCH_TIMEOUT_MS = 60_000;
const MAX_IMAGE_BYTES = 5_000_000; // ~5MB

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
      const buf = await res.arrayBuffer();
      if (buf.byteLength > MAX_IMAGE_BYTES) return { ok: false, reason: `too_large:${buf.byteLength}` };
      const base64 = base64Encode(new Uint8Array(buf));
      return { ok: true, base64, bytes: buf.byteLength, mimeType };
    }

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

// Call Google Gemini API with specified API key
async function callGeminiApi(
  apiKey: string,
  contentParts: any[],
  keyName: string
): Promise<{ ok: boolean; data?: any; status?: number; error?: string }> {
  console.log(`Calling Google Gemini API with ${keyName}...`);
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: contentParts
          }]
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Gemini API error (${keyName}):`, response.status, errorText);
      return { ok: false, status: response.status, error: errorText };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (e) {
    console.error(`Google Gemini API exception (${keyName}):`, e);
    return { ok: false, error: (e as Error).message };
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
    const geminiApiKey1 = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    const geminiApiKey2 = Deno.env.get('GOOGLE_GEMINI_API_KEY_2');

    if (!geminiApiKey1) {
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

    console.log(`Processing task ${taskId}`);

    // Separate product images from reference
    const productImages = jobImages.filter(img => img.type !== 'reference');
    const referenceImage = jobImages.find(img => img.type === 'reference');

    console.log(`Found ${productImages.length} product images and ${referenceImage ? 1 : 0} reference in job data`);

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

    // Download product images as base64
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

    if (productImageBase64.length === 0) {
      console.error('Failed to download any product images');
      
      const errorMessage = 'Изображение слишком большое (макс. 5 МБ). Пожалуйста, уменьшите размер файла и попробуйте снова.';
      
      await supabase
        .from('generation_tasks')
        .update({
          status: 'failed',
          last_error: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      return new Response(
        JSON.stringify({ error: 'Failed to download product images' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download reference (optional)
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

    // Build content parts for Google Gemini API
    const contentParts: any[] = [];
    
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

    for (const img of productImageBase64) {
      contentParts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.base64,
        },
      });
    }

    if (referenceBase64) {
      contentParts.push({
        inlineData: {
          mimeType: referenceBase64.mimeType,
          data: referenceBase64.base64,
        },
      });
    }

    // Try primary API key first
    let aiResult = await callGeminiApi(geminiApiKey1, contentParts, 'PRIMARY_KEY');
    
    // If primary key fails with 503/429/403, wait 2 seconds and try fallback key
    if (!aiResult.ok && (aiResult.status === 503 || aiResult.status === 429 || aiResult.status === 403)) {
      if (geminiApiKey2) {
        console.log(`Primary API key returned ${aiResult.status}, waiting ${FALLBACK_DELAY_MS}ms before trying fallback API key...`);
        await new Promise(resolve => setTimeout(resolve, FALLBACK_DELAY_MS));
        aiResult = await callGeminiApi(geminiApiKey2, contentParts, 'FALLBACK_KEY');
        
        if (aiResult.ok) {
          console.log('Fallback API key succeeded!');
        } else if (aiResult.status === 503 || aiResult.status === 429 || aiResult.status === 403) {
          // Fallback also failed, wait 10 seconds and try primary key one more time
          console.log(`Fallback API key also returned ${aiResult.status}, waiting ${FINAL_RETRY_DELAY_MS}ms before final retry on primary key...`);
          await new Promise(resolve => setTimeout(resolve, FINAL_RETRY_DELAY_MS));
          aiResult = await callGeminiApi(geminiApiKey1, contentParts, 'PRIMARY_KEY_FINAL_RETRY');
          
          if (aiResult.ok) {
            console.log('Final retry on primary API key succeeded!');
          }
        }
      } else {
        console.warn('No fallback API key configured (GOOGLE_GEMINI_API_KEY_2)');
      }
    }

    // Handle API errors
    if (!aiResult.ok) {
      const status = aiResult.status || 500;
      const errorText = aiResult.error || 'Unknown error';
      
      // Handle rate limit, quota exceeded, or service unavailable - both API keys failed
      if (status === 429 || status === 403 || status === 503) {
        const failMessage = status === 503 
          ? 'Сервис временно перегружен. Попробуйте через несколько минут.' 
          : 'Превышена квота API. Попробуйте позже.';
        
        console.log(`Both API keys failed with status ${status}, marking task as failed`);
        
        await supabase
          .from('generation_tasks')
          .update({
            status: 'failed',
            last_error: `google_${status}_both_keys_failed`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskId);

        // Refund tokens
        const tokensToRefund = 1;
        console.log(`Refunding ${tokensToRefund} tokens to user ${task.job.user_id} for failed task ${taskId}`);
        await supabase.rpc('refund_tokens', {
          user_id_param: task.job.user_id,
          tokens_amount: tokensToRefund,
          reason_text: `Возврат за неудачную генерацию: ${failMessage}`
        });

        await supabase.from('notifications').insert({
          user_id: task.job.user_id,
          type: 'error',
          title: 'Ошибка генерации',
          message: `Не удалось сгенерировать карточку "${task.job.product_name}". ${failMessage} Токены возвращены на баланс.`
        });

        throw new Error(failMessage);
      }

      // Handle bad request
      if (status === 400) {
        await supabase
          .from('generation_tasks')
          .update({
            status: 'failed',
            last_error: 'google_400_bad_request',
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskId);

        throw new Error(`Bad request: ${errorText}`);
      }

      throw new Error(`Google Gemini API error: ${errorText}`);
    }

    // Success - extract image
    const aiData = aiResult.data;
    console.log('AI response received:', JSON.stringify(aiData).substring(0, 200));
    
    const generatedImageBase64 = aiData.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData)?.inlineData?.data;

    if (!generatedImageBase64) {
      console.error('No image in response:', JSON.stringify(aiData));
      throw new Error('No image generated by Google Gemini');
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
