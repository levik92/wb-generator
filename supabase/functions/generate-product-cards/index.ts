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
    const { 
      productName, 
      category, 
      description, 
      userId, 
      productImages = [],
      cardType = null,
      cardIndex = null 
    } = requestBody;

    // Call the shared generation logic directly (no HTTP call)
    const result = await generateProductCards({
      productName,
      category,
      description,
      userId,
      productImages,
      cardType,
      cardIndex
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-product-cards function:', error);
    
    return new Response(JSON.stringify({
      error: error.message || 'Произошла ошибка при генерации карточек'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});