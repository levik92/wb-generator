import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { Canvas, createCanvas, loadImage } from "https://deno.land/x/canvas@v1.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_RETRIES = 3;

// Add label to image
async function addLabelToImage(imageDataUrl: string, label: string): Promise<string> {
  try {
    // Load the image
    const img = await loadImage(imageDataUrl);
    
    // Create canvas with same dimensions as image
    const canvas = createCanvas(img.width(), img.height());
    const ctx = canvas.getContext('2d');
    
    // Draw original image
    ctx.drawImage(img, 0, 0);
    
    // Configure label style
    const fontSize = 14;
    const padding = 8;
    const borderRadius = 10;
    const margin = 12;
    
    ctx.font = `${fontSize}px Arial`;
    const textMetrics = ctx.measureText(label);
    const textWidth = textMetrics.width;
    
    // Calculate label dimensions
    const labelWidth = textWidth + padding * 2;
    const labelHeight = fontSize + padding * 2;
    
    // Position in top right corner
    const x = img.width() - labelWidth - margin;
    const y = margin;
    
    // Draw rounded rectangle background
    ctx.fillStyle = '#f7f7f7';
    ctx.beginPath();
    ctx.roundRect(x, y, labelWidth, labelHeight, borderRadius);
    ctx.fill();
    
    // Draw text
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + padding, y + labelHeight / 2);
    
    // Convert canvas to base64
    return canvas.toDataURL('image/jpeg', 0.95);
  } catch (error) {
    console.error('Error adding label to image:', error);
    // Return original image if labeling fails
    return imageDataUrl;
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
      throw new Error('Task not found');
    }

    const jobImages = task.job.product_images as Array<{ url: string; name?: string; type?: string }> || [];

    const retryCount = task.retry_count || 0;
    console.log(`Processing task ${taskId}, retry ${retryCount}/${MAX_RETRIES}`);

    // Separate product images from reference
    const productImages = jobImages.filter(img => img.type !== 'reference');
    const referenceImage = jobImages.find(img => img.type === 'reference');

    // Download and convert product images to base64
    const productImageDataUrls: string[] = [];
    for (const img of productImages) {
      try {
        const response = await fetch(img.url);
        if (!response.ok) throw new Error(`Failed to download: ${response.statusText}`);
        const buffer = await response.arrayBuffer();
        const base64 = base64Encode(new Uint8Array(buffer));
        const dataUrl = `data:image/jpeg;base64,${base64}`;
        
        // Add label to product image
        const labeledDataUrl = await addLabelToImage(dataUrl, 'Товар');
        productImageDataUrls.push(labeledDataUrl);
      } catch (error) {
        console.error('Product image download error:', error);
      }
    }

    // Download and convert reference image if exists
    let referenceDataUrl: string | null = null;
    if (referenceImage) {
      try {
        const response = await fetch(referenceImage.url);
        if (!response.ok) throw new Error(`Failed to download reference: ${response.statusText}`);
        const buffer = await response.arrayBuffer();
        const base64 = base64Encode(new Uint8Array(buffer));
        const dataUrl = `data:image/jpeg;base64,${base64}`;
        
        // Add label to reference image
        referenceDataUrl = await addLabelToImage(dataUrl, 'Референс');
      } catch (error) {
        console.error('Reference image download error:', error);
      }
    }

    console.log(`Processing with ${productImageDataUrls.length} product images${referenceDataUrl ? ' and 1 reference' : ''}`);

    // Build content parts for Google Gemini API format
    const contentParts: any[] = [];
    
    // Add product images
    productImageDataUrls.forEach((dataUrl, index) => {
      contentParts.push({
        text: `📦 ФОТО ТОВАРА ${index + 1}:`
      });
      const base64Data = dataUrl.split(',')[1];
      contentParts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data
        }
      });
    });

    // Add reference image if exists
    if (referenceDataUrl) {
      contentParts.push({
        text: '🎨 РЕФЕРЕНС ДИЗАЙНА (ориентируйся на стиль этой карточки):'
      });
      const base64Data = referenceDataUrl.split(',')[1];
      contentParts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data
        }
      });
    }

    // Add main prompt
    const imageGenerationPrompt = `ВАЖНО: Ты ДОЛЖЕН сгенерировать и вернуть ИЗОБРАЖЕНИЕ, а не текст. Не описывай, не объясняй - создай изображение.

Используя предоставленные фото товара, создай новое профессиональное маркетинговое изображение товара.${referenceDataUrl ? ' Ориентируйся на стиль референса дизайна.' : ''}

${prompt}

ОБЯЗАТЕЛЬНО: Верни сгенерированное изображение. НЕ пиши текст, НЕ давай советы - только создай и верни изображение.`;

    contentParts.push({
      text: imageGenerationPrompt
    });

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
