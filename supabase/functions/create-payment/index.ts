import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  packageName: string;
  amount?: number;
  tokens?: number;
  promoCode?: string;
}

const PACKAGES = {
  'Стартовый': { price: 990, tokens: 80 },
  'Профи': { price: 2990, tokens: 250 },
  'Бизнес': { price: 9990, tokens: 850 }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Create payment request received');
    
    // Extract client information for security logging
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    const userAgent = req.headers.get('user-agent');
    
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

const body: PaymentRequest = await req.json();
    
    const packageInfo = PACKAGES[body.packageName as keyof typeof PACKAGES];
    if (!packageInfo) {
      throw new Error("Invalid package");
    }

    // Compute final price/tokens with optional promo
    let finalAmount = packageInfo.price;
    let finalTokens = packageInfo.tokens;
    let appliedPromo: any = null;

    if (body.promoCode) {
      const { data: promo, error: promoError } = await supabaseServiceRole
        .from('promocodes')
        .select('id, code, type, value, max_uses, current_uses, valid_until, is_active')
        .eq('code', body.promoCode.trim().toUpperCase())
        .eq('is_active', true)
        .maybeSingle();
      if (promoError) {
        throw new Error('Promo validation failed');
      }
      if (!promo) {
        throw new Error('Invalid promo code');
      }
      if (promo.valid_until && new Date(promo.valid_until) < new Date()) {
        throw new Error('Promo code expired');
      }
      if (promo.max_uses && promo.current_uses >= promo.max_uses) {
        throw new Error('Promo code usage limit reached');
      }
      if (promo.type === 'discount') {
        finalAmount = Math.round(packageInfo.price * (1 - (promo.value / 100)));
      } else if (promo.type === 'tokens') {
        finalTokens = packageInfo.tokens + promo.value;
      }
      appliedPromo = { id: promo.id, code: promo.code, type: promo.type, value: promo.value };
    }

    console.log(`Creating payment for user ${user.id}, package: ${body.packageName}, amount: ${finalAmount}`);

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
          value: finalAmount.toFixed(2),
          currency: 'RUB'
        },
        confirmation: {
          type: 'redirect',
          return_url: `${req.headers.get("origin")}/dashboard?payment=success`
        },
        capture: true,
        description: `Пополнение баланса: ${body.packageName} (${finalTokens} токенов)`,
        receipt: {
          customer: {
            email: user.email
          },
          items: [
            {
              description: `Токены для WB Генератор: ${body.packageName}`,
              quantity: "1.00",
              amount: {
                value: finalAmount.toFixed(2),
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
          package_name: body.packageName,
          tokens_amount: finalTokens.toString(),
          promo_code: appliedPromo?.code || '',
          promo_type: appliedPromo?.type || '',
          promo_value: appliedPromo?.value?.toString() || ''
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
        amount: finalAmount,
        currency: 'RUB',
        status: 'pending',
        tokens_amount: finalTokens,
        package_name: body.packageName,
        metadata: { ...yookassaData, promo: appliedPromo }
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error(`Database error: ${insertError.message}`);
    }

    // Log security event for payment creation
    await supabaseServiceRole.rpc('log_security_event', {
      user_id_param: user.id,
      event_type_param: 'payment_created',
      event_description_param: `Payment created for package: ${body.packageName}, amount: ${finalAmount} RUB`,
      ip_address_param: clientIP,
      user_agent_param: userAgent,
      metadata_param: { payment_id: yookassaData.id, package_name: body.packageName, promo: appliedPromo }
    });

    return new Response(JSON.stringify({ 
      payment_url: yookassaData.confirmation.confirmation_url,
      payment_id: yookassaData.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in create-payment function:', error);
    
    // Log security event for payment error
    try {
      const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
      const userAgent = req.headers.get('user-agent');
      const supabaseServiceRole = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      
      await supabaseServiceRole.rpc('log_security_event', {
        user_id_param: null,
        event_type_param: 'payment_error',
        event_description_param: `Payment creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ip_address_param: clientIP,
        user_agent_param: userAgent,
        metadata_param: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    } catch (logError) {
      console.error('Failed to log security event:', logError);
    }
    
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});