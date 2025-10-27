import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { user_id, partner_code } = await req.json();

    if (!user_id || !partner_code) {
      throw new Error('Missing user_id or partner_code');
    }

    console.log('Processing partner signup:', { user_id, partner_code });

    // Находим партнера по коду
    const { data: partnerProfile, error: partnerError } = await supabaseServiceRole
      .from('partner_profiles')
      .select('id, user_id')
      .eq('partner_code', partner_code)
      .single();

    if (partnerError || !partnerProfile) {
      console.error('Partner not found:', partnerError);
      throw new Error('Invalid partner code');
    }

    // Проверяем, что пользователь не регистрируется сам по своей же ссылке
    if (partnerProfile.user_id === user_id) {
      console.log('User trying to use own partner link, skipping');
      return new Response(
        JSON.stringify({ success: true, message: 'Cannot refer yourself' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Проверяем, не был ли пользователь уже привлечен этим партнером
    const { data: existingReferral } = await supabaseServiceRole
      .from('partner_referrals')
      .select('id')
      .eq('partner_id', partnerProfile.id)
      .eq('referred_user_id', user_id)
      .single();

    if (existingReferral) {
      console.log('Referral already exists, skipping');
      return new Response(
        JSON.stringify({ success: true, message: 'Referral already exists' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Создаем запись о партнерском реферале
    const { error: referralError } = await supabaseServiceRole
      .from('partner_referrals')
      .insert({
        partner_id: partnerProfile.id,
        referred_user_id: user_id,
        status: 'registered'
      });

    if (referralError) {
      console.error('Error creating partner referral:', referralError);
      throw referralError;
    }

    // Увеличиваем счетчик приглашенных клиентов
    const { data: currentProfile, error: fetchError } = await supabaseServiceRole
      .from('partner_profiles')
      .select('invited_clients_count')
      .eq('id', partnerProfile.id)
      .single();

    if (!fetchError && currentProfile) {
      const { error: updateError } = await supabaseServiceRole
        .from('partner_profiles')
        .update({ 
          invited_clients_count: (currentProfile.invited_clients_count || 0) + 1
        })
        .eq('id', partnerProfile.id);

      if (updateError) {
        console.error('Error updating partner stats:', updateError);
      }
    }

    console.log('Partner signup processed successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error in process-partner-signup:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});