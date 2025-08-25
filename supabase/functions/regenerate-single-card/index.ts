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
    const { productName, category, description, userId, cardIndex, cardType } = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check and spend tokens for single card regeneration (1 token)
    const { data: tokenResult, error: tokenError } = await supabase.rpc('spend_tokens', {
      user_id_param: userId,
      tokens_amount: 1
    });

    if (tokenError) {
      console.error('Token spending error:', tokenError);
      throw new Error('Ошибка при списании токенов');
    }

    if (!tokenResult) {
      return new Response(JSON.stringify({ 
        error: 'Недостаточно токенов для перегенерации' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Simulate single card regeneration processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Save generation to database
    const { error: saveError } = await supabase
      .from('generations')
      .insert({
        user_id: userId,
        generation_type: 'single_card',
        input_data: {
          productName,
          category,
          description,
          cardIndex,
          cardType
        },
        output_data: {
          card: `regenerated_${cardType}_${cardIndex}.png`,
          message: `Карточка "${cardType}" успешно перегенерирована`
        },
        tokens_used: 1,
        status: 'completed',
        product_name: productName,
        category: category,
        description_requirements: description
      });

    if (saveError) {
      console.error('Error saving generation:', saveError);
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: `Карточка "${cardType}" успешно перегенерирована`,
      card: `regenerated_${cardType}_${cardIndex}.png`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in regenerate-single-card function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Произошла ошибка при перегенерации карточки' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});