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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Log environment info at the start
  const startTime = Date.now();
  console.log('=== CREATE PAYMENT FUNCTION START ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Deno version:', Deno.version.deno);
  console.log('V8 version:', Deno.version.v8);
  console.log('TypeScript version:', Deno.version.typescript);
  console.log('SUPABASE_URL:', Deno.env.get("SUPABASE_URL"));
  console.log('Expected region: us-east-2 (Ohio)');
  
  try {
    // Extract client information for security logging
    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientIP = forwardedFor ? forwardedFor.split(',')[0].trim() : req.headers.get('x-real-ip');
    const userAgent = req.headers.get('user-agent');
    
    console.log('Client IP:', clientIP);
    console.log('User Agent:', userAgent?.substring(0, 100));
    
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
    console.log('Request body:', JSON.stringify(body));
    
    // Fetch package info from database
    const { data: packageData, error: packageError } = await supabaseServiceRole
      .from('payment_packages')
      .select('*')
      .eq('name', body.packageName)
      .eq('is_active', true)
      .maybeSingle();
    
    if (packageError || !packageData) {
      console.error('Package error:', packageError);
      throw new Error("Invalid package");
    }
    
    const packageInfo = { price: packageData.price, tokens: packageData.tokens };
    console.log('Package info:', JSON.stringify(packageInfo));

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

    console.log(`Creating payment: user=${user.id}, package=${body.packageName}, amount=${finalAmount}, tokens=${finalTokens}`);

    const idempotenceKey = `${user.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const paymentPayload = {
      amount: {
        value: finalAmount.toFixed(2),
        currency: 'RUB'
      },
      confirmation: {
        type: 'redirect',
        return_url: `${req.headers.get("origin") || 'https://wbgen.ru'}/dashboard?payment=success`
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
    };

    const yookassaSecretKey = Deno.env.get("YOOKASSA_SECRET_KEY");
    if (!yookassaSecretKey) {
      throw new Error('YooKassa secret key not configured');
    }
    
    console.log('=== YOOKASSA API CALL START ===');
    console.log('Target URL: https://api.yookassa.ru/v3/payments');
    console.log('Idempotence Key:', idempotenceKey);
    
    // Single attempt with detailed logging
    let yookassaData: any = null;
    const maxAttempts = 3;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const attemptStart = Date.now();
      console.log(`\n--- Attempt ${attempt}/${maxAttempts} ---`);
      console.log('Attempt start time:', new Date().toISOString());
      
      try {
        // Create AbortController with 30 second timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log('Request timeout triggered after 30s');
          controller.abort();
        }, 30000);
        
        console.log('Sending fetch request...');
        
        const response = await fetch('https://api.yookassa.ru/v3/payments', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`1150875:${yookassaSecretKey}`)}`,
            'Content-Type': 'application/json',
            'Idempotence-Key': idempotenceKey,
          },
          body: JSON.stringify(paymentPayload),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        const attemptDuration = Date.now() - attemptStart;
        console.log(`Response received in ${attemptDuration}ms`);
        console.log('Response status:', response.status);
        console.log('Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('YooKassa API error response:', errorText);
          throw new Error(`YooKassa API error: ${response.status} - ${errorText}`);
        }
        
        yookassaData = await response.json();
        console.log('YooKassa payment created successfully!');
        console.log('Payment ID:', yookassaData.id);
        console.log('Confirmation URL:', yookassaData.confirmation?.confirmation_url);
        break; // Success
        
      } catch (error) {
        const attemptDuration = Date.now() - attemptStart;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Attempt ${attempt} failed after ${attemptDuration}ms:`, errorMessage);
        
        // Check if retriable
        const isRetriable = errorMessage.toLowerCase().includes('abort') ||
                           errorMessage.toLowerCase().includes('timeout') ||
                           errorMessage.toLowerCase().includes('connection') ||
                           errorMessage.toLowerCase().includes('tls') ||
                           errorMessage.toLowerCase().includes('eof') ||
                           errorMessage.toLowerCase().includes('peer') ||
                           errorMessage.toLowerCase().includes('reset') ||
                           errorMessage.toLowerCase().includes('network');
        
        if (isRetriable && attempt < maxAttempts) {
          const delay = attempt * 3000; // 3s, 6s delays
          console.log(`Retriable error detected. Waiting ${delay}ms before retry...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        
        // Throw on last attempt or non-retriable error
        throw error;
      }
    }
    
    if (!yookassaData) {
      throw new Error('Failed to create payment after all attempts');
    }

    console.log('=== YOOKASSA API CALL SUCCESS ===');

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

    console.log('Payment saved to database');

    // Log security event for payment creation
    await supabaseServiceRole.rpc('log_security_event', {
      user_id_param: user.id,
      event_type_param: 'payment_created',
      event_description_param: `Payment created for package: ${body.packageName}, amount: ${finalAmount} RUB`,
      ip_address_param: clientIP,
      user_agent_param: userAgent,
      metadata_param: { payment_id: yookassaData.id, package_name: body.packageName, promo: appliedPromo }
    });

    const totalDuration = Date.now() - startTime;
    console.log(`=== CREATE PAYMENT FUNCTION END (${totalDuration}ms) ===`);

    return new Response(JSON.stringify({ 
      payment_url: yookassaData.confirmation.confirmation_url,
      payment_id: yookassaData.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`=== CREATE PAYMENT FUNCTION ERROR (${totalDuration}ms) ===`);
    console.error('Error:', error instanceof Error ? error.message : String(error));
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
    
    // Log security event for payment error
    try {
      const forwardedFor = req.headers.get('x-forwarded-for');
      const clientIP = forwardedFor ? forwardedFor.split(',')[0].trim() : req.headers.get('x-real-ip');
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
