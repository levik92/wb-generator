import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateProductCards } from '../_shared/card-generator.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const IS_EDGE = typeof Deno !== 'undefined' && !!(Deno as any).serve;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { productName, category, description, userId, cardIndex, cardType } = requestBody;

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

    if (typeof cardIndex !== 'number' || cardIndex < 0 || cardIndex > 10) {
      return new Response(JSON.stringify({ error: 'Invalid card index' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!cardType || typeof cardType !== 'string' || cardType.length > 50) {
      return new Response(JSON.stringify({ error: 'Invalid card type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sanitize inputs to prevent injection attacks
    const sanitizedProductName = productName.replace(/[<>\"']/g, '').trim();
    const sanitizedCategory = category.replace(/[<>\"']/g, '').trim();
    const sanitizedDescription = description.replace(/[<>\"']/g, '').trim();
    const sanitizedCardType = cardType.replace(/[<>\"']/g, '').trim();

    // Content filtering for harmful content
    const blockedTerms = ['<script>', 'javascript:', 'data:', 'vbscript:', 'onload', 'onerror'];
    const fullText = `${productName} ${category} ${description} ${cardType}`.toLowerCase();
    
    if (blockedTerms.some(term => fullText.includes(term))) {
      return new Response(JSON.stringify({ error: 'Invalid content detected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call the shared generation logic directly (no HTTP call - this prevents recursion!)
    const result = await generateProductCards({
      productName: sanitizedProductName,
      category: sanitizedCategory,
      description: sanitizedDescription,
      userId: userId,
      productImages: requestBody.productImages || [],
      cardType: sanitizedCardType,
      cardIndex: cardIndex
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: result.message || `Карточка ${sanitizedCardType} перегенерирована`,
      regeneratedCard: result.images?.[0] || null,
      cardIndex: result.cardIndex
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in regenerate-single-card function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Произошла ошибка при перегенерации карточки' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});