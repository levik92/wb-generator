import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  packageName: string;
  amount: number;
  tokens: number;
}

const PACKAGES = {
  'Стартовый': { price: 499, tokens: 50 },
  'Профи': { price: 1499, tokens: 200 },
  'Бизнес': { price: 5999, tokens: 1000 }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Create payment request received');
    
    const supabaseServiceRole = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    const { packageName, amount, tokens }: PaymentRequest = await req.json();
    
    // Validate package
    const packageInfo = PACKAGES[packageName as keyof typeof PACKAGES];
    if (!packageInfo || packageInfo.price !== amount || packageInfo.tokens !== tokens) {
      throw new Error("Invalid package information");
    }

    console.log(`Creating payment for user ${user.id}, package: ${packageName}, amount: ${amount}`);

    // Create payment in ЮKassa
    const yookassaResponse = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`1150875:${Deno.env.get("YOOKASSA_SECRET_KEY")}`)}`,
        'Content-Type': 'application/json',
        'Idempotence-Key': `${user.id}-${Date.now()}`
      },
      body: JSON.stringify({
        amount: {
          value: amount.toFixed(2),
          currency: 'RUB'
        },
        confirmation: {
          type: 'redirect',
          return_url: `${req.headers.get("origin")}/dashboard?payment=success`
        },
        capture: true,
        description: `Пополнение баланса: ${packageName} (${tokens} токенов)`,
        receipt: {
          customer: {
            email: user.email
          },
          items: [
            {
              description: `Токены для WB Генератор: ${packageName}`,
              quantity: "1.00",
              amount: {
                value: amount.toFixed(2),
                currency: 'RUB'
              },
              vat_code: 1,
              payment_mode: "full_payment",
              payment_subject: "service"
            }
          ]
        },
        metadata: {
          user_id: user.id,
          package_name: packageName,
          tokens_amount: tokens.toString()
        }
      })
    });

    if (!yookassaResponse.ok) {
      const errorData = await yookassaResponse.text();
      console.error('ЮKassa API error:', errorData);
      throw new Error(`ЮKassa API error: ${yookassaResponse.status}`);
    }

    const yookassaData = await yookassaResponse.json();
    console.log('ЮKassa payment created:', yookassaData.id);

    // Store payment in database
    const { error: insertError } = await supabaseServiceRole
      .from('payments')
      .insert({
        user_id: user.id,
        yookassa_payment_id: yookassaData.id,
        amount: amount,
        currency: 'RUB',
        status: 'pending',
        tokens_amount: tokens,
        package_name: packageName,
        metadata: yookassaData
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error(`Database error: ${insertError.message}`);
    }

    return new Response(JSON.stringify({ 
      payment_url: yookassaData.confirmation.confirmation_url,
      payment_id: yookassaData.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in create-payment function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});