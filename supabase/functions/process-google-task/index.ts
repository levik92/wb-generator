import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_RETRIES = 3;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const failTask = async (
    supabase: any,
    taskId: string,
    lastError: string,
    statusCode = 500,
    details?: string,
  ) => {
    try {
      await supabase
        .from("generation_tasks")
        .update({
          status: "failed",
          last_error: lastError,
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId);
    } catch (e) {
      console.error("Failed to update task status:", e);
    }

    return new Response(JSON.stringify({ error: lastError, details }), {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  };

  try {
    const { taskId, sourceImageUrl, prompt } = await req.json();

    if (!taskId || !sourceImageUrl || !prompt) {
      return new Response(JSON.stringify({ error: "Missing required parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiApiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");

    if (!geminiApiKey) {
      throw new Error("GOOGLE_GEMINI_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get task details
    const { data: task, error: taskError } = await supabase
      .from("generation_tasks")
      .select("*, job:generation_jobs(*)")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      console.error("Task not found:", taskError?.message || "No task data");
      return new Response(JSON.stringify({ error: "Task not found", details: taskError?.message }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!task.job) {
      console.error("Job not found for task:", taskId);
      return new Response(JSON.stringify({ error: "Job not found for task" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jobImages = (task.job.product_images as Array<{ url: string; name?: string; type?: string }>) || [];

    if (!jobImages || jobImages.length === 0) {
      console.error("No images in job data");
      return await failTask(supabase, taskId, "Не найдены изображения в задании.", 400);
    }

    const retryCount = task.retry_count || 0;
    console.log(`Processing task ${taskId}, retry ${retryCount}/${MAX_RETRIES}`);

    // Separate product images from reference
    const allProductImages = jobImages.filter((img) => img.type !== "reference");
    const referenceImage = jobImages.find((img) => img.type === "reference");

    // IMPORTANT: keep memory low in Edge Runtime.
    // 546 in Supabase Edge often means the runtime killed the function ("Memory limit exceeded").
    // We only send ONE product image + optional reference to Gemini.
    const productImages = allProductImages.slice(0, 1);

    console.log(
      `Found ${allProductImages.length} product images (using ${productImages.length}) and ${referenceImage ? 1 : 0} reference in job data`,
    );

    if (productImages.length === 0) {
      console.error("No product images found in job data");
      return await failTask(supabase, taskId, "Не найдены изображения товара для генерации.", 400);
    }

    const buildRenderUrlIfSupabasePublicObject = (url: string, opts: { width: number; quality: number }) => {
      // Convert:
      //  .../storage/v1/object/public/<bucket>/<path>
      // to:
      //  .../storage/v1/render/image/public/<bucket>/<path>?width=...&quality=...&resize=contain
      try {
        const u = new URL(url);
        const marker = "/storage/v1/object/public/";
        const idx = u.pathname.indexOf(marker);
        if (idx === -1) return url;

        const rest = u.pathname.slice(idx + marker.length); // <bucket>/<path>
        u.pathname = `/storage/v1/render/image/public/${rest}`;
        u.searchParams.set("width", String(opts.width));
        u.searchParams.set("quality", String(opts.quality));
        u.searchParams.set("resize", "contain");
        return u.toString();
      } catch {
        return url;
      }
    };

    const downloadAsBase64 = async (url: string, timeoutMs: number) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const resp = await fetch(url, { signal: controller.signal });
        if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
        const buffer = await resp.arrayBuffer();
        return { base64: base64Encode(new Uint8Array(buffer)), bytes: buffer.byteLength };
      } finally {
        clearTimeout(timeoutId);
      }
    };

    // Download and convert product images to base64 (use resized variants to avoid memory spikes)
    const productImageBase64List: string[] = [];

    for (const img of productImages) {
      if (!img?.url) continue;
      try {
        const fetchUrl = buildRenderUrlIfSupabasePublicObject(img.url, { width: 1024, quality: 75 });
        console.log(`Downloading product image (resized): ${fetchUrl.substring(0, 120)}...`);
        const { base64, bytes } = await downloadAsBase64(fetchUrl, 30000);
        productImageBase64List.push(base64);
        console.log(`Successfully downloaded product image (${bytes} bytes)`);
      } catch (error) {
        console.error("Product image download error:", (error as any)?.message || error);
      }
    }

    if (productImageBase64List.length === 0) {
      console.error("Failed to download any product images");
      return await failTask(
        supabase,
        taskId,
        "Не удалось загрузить изображения товара. Проверьте доступность файлов.",
        400,
      );
    }

    // Download and convert reference image if exists (also resized)
    let referenceBase64: string | null = null;
    if (referenceImage?.url) {
      try {
        const fetchUrl = buildRenderUrlIfSupabasePublicObject(referenceImage.url, { width: 768, quality: 70 });
        console.log(`Downloading reference image (resized): ${fetchUrl.substring(0, 120)}...`);
        const { base64, bytes } = await downloadAsBase64(fetchUrl, 30000);
        referenceBase64 = base64;
        console.log(`Successfully downloaded reference image (${bytes} bytes)`);
      } catch (error) {
        console.error("Reference image download error:", (error as any)?.message || error);
      }
    }

    console.log(
      `Processing with ${productImageBase64List.length} product images${referenceBase64 ? " and 1 reference" : ""}`,
    );

    // Build content parts for Google Gemini API format
    const contentParts: any[] = [];

    const structuredInstruction = `ВАЖНАЯ ИНФОРМАЦИЯ О СТРУКТУРЕ ИЗОБРАЖЕНИЙ:

Я отправляю тебе ${productImageBase64List.length + (referenceBase64 ? 1 : 0)} изображений в следующем порядке:

ФОТОГРАФИИ ТОВАРА (используй эти изображения для создания карточки):
${productImageBase64List
  .map((_, index) => `• Изображение ${index + 1}: ФОТО ТОВАРА - основа для создания карточки`)
  .join("\n")}
${referenceBase64 ? `\nРЕФЕРЕНС ДИЗАЙНА (используй только как пример стиля оформления):\n• Изображение ${productImageBase64List.length + 1}: РЕФЕРЕНС - ориентируйся на СТИЛЬ, КОМПОЗИЦИЮ и ОФОРМЛЕНИЕ этой карточки. ТОВАР бери ТОЛЬКО из предыдущих изображений товара, НЕ копируй товар с референса!` : ""}

ТВОЯ ЗАДАЧА:
${prompt}

КРИТИЧЕСКИ ВАЖНО:
1. Товар для карточки бери ТОЛЬКО из первых ${productImageBase64List.length} изображений (фото товара)
${referenceBase64 ? `2. Последнее изображение (референс) используй ТОЛЬКО для понимания стиля оформления, но НЕ копируй сам товар\n3. Создай новую карточку с товаром из фото товара в стиле референса` : "2. Создай профессиональную маркетинговую карточку товара"}

ОБЯЗАТЕЛЬНО: Верни сгенерированное ИЗОБРАЖЕНИЕ карточки товара.`;

    contentParts.push({ text: structuredInstruction });

    // Add product images
    productImageBase64List.forEach((base64Data) => {
      contentParts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data,
        },
      });
    });

    // Add reference image if exists (always last)
    if (referenceBase64) {
      contentParts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: referenceBase64,
        },
      });
    }

    console.log("Calling Google Gemini 3 Pro Image API for image generation...");

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: contentParts,
            },
          ],
        }),
      },
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Google Gemini 3 Pro Image API error:", aiResponse.status, errorText);

      // Handle rate limit or quota exceeded
      if (aiResponse.status === 429 || aiResponse.status === 403) {
        if (retryCount < MAX_RETRIES) {
          const retryDelay = Math.pow(2, retryCount) * 5000;
          await supabase
            .from("generation_tasks")
            .update({
              status: "retrying",
              retry_count: retryCount + 1,
              retry_after: retryDelay,
              last_error: "API quota exceeded, will retry",
              updated_at: new Date().toISOString(),
            })
            .eq("id", taskId);

          return new Response(JSON.stringify({ message: "Task will retry", retryAfter: retryDelay }), {
            status: 202,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabase
          .from("generation_tasks")
          .update({
            status: "failed",
            last_error: "Превышена квота API. Попробуйте позже.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", taskId);

        throw new Error("Quota exceeded");
      }

      if (aiResponse.status === 400) {
        return await failTask(supabase, taskId, "Некорректный запрос к API.", 400, errorText);
      }

      return await failTask(supabase, taskId, "Ошибка API генерации изображения.", 502, errorText);
    }

    const aiData = await aiResponse.json();
    console.log("AI response received:", JSON.stringify(aiData).substring(0, 200));

    const generatedImageBase64 = aiData.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData)
      ?.inlineData?.data;

    if (!generatedImageBase64) {
      console.error("No image in response:", JSON.stringify(aiData));
      return await failTask(supabase, taskId, "Модель не вернула изображение.", 502);
    }

    // Convert base64 to Uint8Array for storage
    const imageBytes = Uint8Array.from(atob(generatedImageBase64), (c) => c.charCodeAt(0));

    // Upload to Supabase Storage
    const fileName = `${task.job.user_id}/${task.job_id}/${task.card_index}_${task.card_type}.png`;
    const { error: uploadError } = await supabase.storage
      .from("generated-cards")
      .upload(fileName, imageBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return await failTask(supabase, taskId, "Не удалось сохранить изображение.", 500, uploadError.message);
    }

    const { data: urlData } = supabase.storage.from("generated-cards").getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      return await failTask(supabase, taskId, "Не удалось получить ссылку на изображение.", 500);
    }

    await supabase
      .from("generation_tasks")
      .update({
        status: "completed",
        image_url: urlData.publicUrl,
        storage_path: fileName,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    await supabase.rpc("update_job_progress", { job_id_param: task.job_id });

    console.log(`Task ${taskId} completed successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: urlData.publicUrl,
        storagePath: fileName,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in process-google-task:", error);
    return new Response(JSON.stringify({ error: (error as any)?.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
