import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateProductCards } from '../_shared/card-generator.ts';

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
    const { productName, category, description, userId } = requestBody;

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

    // Sanitize inputs to prevent injection attacks
    const sanitizedProductName = productName.replace(/[<>\"']/g, '').trim();
    const sanitizedCategory = category.replace(/[<>\"']/g, '').trim();
    const sanitizedDescription = description.replace(/[<>\"']/g, '').trim();
    const blockedTerms = ['<script>', 'javascript:', 'data:', 'vbscript:', 'onload', 'onerror'];
    const fullText = `${productName} ${category} ${description}`.toLowerCase();
    
    if (blockedTerms.some(term => fullText.includes(term))) {
      return new Response(JSON.stringify({ error: 'Invalid content detected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call the shared generation logic directly (no HTTP call - prevents recursion!)
    const generationData = await generateProductCards({
      productName: sanitizedProductName,
      category: sanitizedCategory,
      description: sanitizedDescription,
      userId: userId,
      productImages: requestBody.productImages || []
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: generationData.message || 'Карточки товара успешно созданы',
      images: generationData.images || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-cards function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Произошла ошибка при генерации карточек' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});