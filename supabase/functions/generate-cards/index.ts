import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check and spend tokens
    const { data: tokenResult, error: tokenError } = await supabase.rpc('spend_tokens', {
      user_id_param: userId,
      tokens_amount: 6
    });

    if (tokenError) {
      console.error('Token spending error:', tokenError);
      throw new Error('Ошибка при списании токенов');
    }

    if (!tokenResult) {
      return new Response(JSON.stringify({ 
        error: 'Недостаточно токенов для генерации' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call the new generate-product-cards function
    const { data: generationData, error: generationError } = await supabase.functions.invoke('generate-product-cards', {
      body: {
        productName: sanitizedProductName,
        category: sanitizedCategory,
        description: sanitizedDescription,
        userId: userId,
        productImages: requestBody.productImages || []
      }
    });

    if (generationError) {
      console.error('Error calling generate-product-cards:', generationError);
      throw new Error('Ошибка при генерации карточек');
    }

    if (generationData.error) {
      throw new Error(generationData.error);
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: generationData.message || 'Карточки товара успешно созданы',
      images: generationData.images || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-cards function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Произошла ошибка при генерации карточек' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});