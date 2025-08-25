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
    const { productName, category, description, userId } = await req.json();
    
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

    // Simulate card generation processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Save generation to database
    const { error: saveError } = await supabase
      .from('generations')
      .insert({
        user_id: userId,
        generation_type: 'cards',
        input_data: {
          productName,
          category,
          description
        },
        output_data: {
          cards: ['card1.png', 'card2.png', 'card3.png'],
          message: 'Карточки товара успешно созданы'
        },
        tokens_used: 6,
        status: 'completed',
        product_name: productName,
        category: category,
        description_requirements: description
      });

    if (saveError) {
      console.error('Error saving generation:', saveError);
    }

    // Create notification for user
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'Карточки созданы!',
        message: `Сгенерированы карточки для товара "${productName}" в категории "${category}"`,
        type: 'generation'
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Карточки товара успешно созданы',
      cards: ['card1.png', 'card2.png', 'card3.png']
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