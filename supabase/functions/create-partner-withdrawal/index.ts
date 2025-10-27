import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { amount } = await req.json();

    console.log('Creating withdrawal request for user:', user.id, 'amount:', amount);

    // Get partner profile
    const { data: partnerProfile, error: partnerError } = await supabaseClient
      .from('partner_profiles')
      .select('id, current_balance')
      .eq('user_id', user.id)
      .single();

    if (partnerError || !partnerProfile) {
      throw new Error('Partner profile not found');
    }

    // Check minimum amount
    if (amount < 5000) {
      throw new Error('Минимальная сумма для вывода 5000 ₽');
    }

    // Check sufficient balance
    if (partnerProfile.current_balance < amount) {
      throw new Error('Insufficient balance');
    }

    // Get bank details
    const { data: bankDetails, error: bankError } = await supabaseClient
      .from('partner_bank_details')
      .select('*')
      .eq('partner_id', partnerProfile.id)
      .single();

    if (bankError || !bankDetails) {
      throw new Error('Bank details not found. Please add your bank details first.');
    }

    // Create withdrawal request
    const { data: withdrawal, error: withdrawalError } = await supabaseClient
      .from('partner_withdrawals')
      .insert({
        partner_id: partnerProfile.id,
        amount: amount,
        status: 'processing',
        bank_details_snapshot: {
          bank_name: bankDetails.bank_name,
          card_number: bankDetails.card_number,
          phone_number: bankDetails.phone_number,
          full_name: bankDetails.full_name
        }
      })
      .select()
      .single();

    if (withdrawalError) {
      console.error('Error creating withdrawal:', withdrawalError);
      throw withdrawalError;
    }

    // Update partner balance
    const { error: updateError } = await supabaseClient
      .from('partner_profiles')
      .update({
        current_balance: partnerProfile.current_balance - amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', partnerProfile.id);

    if (updateError) {
      console.error('Error updating balance:', updateError);
      throw updateError;
    }

    console.log('Withdrawal created successfully:', withdrawal.id);

    return new Response(
      JSON.stringify({
        success: true,
        withdrawal_id: withdrawal.id,
        message: 'Запрос на вывод средств принят. Деньги будут отправлены на ваш счет в течение 10 рабочих дней.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in create-partner-withdrawal:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
