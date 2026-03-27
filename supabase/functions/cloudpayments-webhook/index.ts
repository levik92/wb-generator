import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function verifyHmac(body: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false;
  
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const expectedSig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
    const expectedBase64 = btoa(String.fromCharCode(...new Uint8Array(expectedSig)));
    
    // Constant-time comparison
    if (signature.length !== expectedBase64.length) return false;
    let result = 0;
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ expectedBase64.charCodeAt(i);
    }
    return result === 0;
  } catch (error) {
    console.error('HMAC verification error:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('CloudPayments webhook received');
    
    const requestBody = await req.text();
    const contentHmac = req.headers.get('Content-HMAC');
    
    const apiSecret = Deno.env.get("CLOUDPAYMENTS_API_SECRET");
    if (!apiSecret) {
      console.error('CLOUDPAYMENTS_API_SECRET not configured');
      return new Response(JSON.stringify({ code: 13 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    
    // Verify HMAC signature
    const isValid = await verifyHmac(requestBody, contentHmac, apiSecret);
    if (!isValid) {
      console.error('Invalid HMAC signature');
      
      const supabaseServiceRole = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );
      
      const forwardedFor = req.headers.get('x-forwarded-for');
      const clientIP = forwardedFor ? forwardedFor.split(',')[0].trim() : req.headers.get('x-real-ip');
      
      await supabaseServiceRole.rpc('log_security_event', {
        user_id_param: null,
        event_type_param: 'cloudpayments_invalid_signature',
        event_description_param: 'CloudPayments webhook with invalid HMAC signature',
        ip_address_param: clientIP,
        user_agent_param: req.headers.get('user-agent'),
        metadata_param: { timestamp: new Date().toISOString() }
      });
      
      return new Response(JSON.stringify({ code: 13 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    
    // Parse the webhook body (CloudPayments sends form-urlencoded or JSON)
    let webhookData: Record<string, string>;
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(requestBody);
      webhookData = Object.fromEntries(params.entries());
    } else {
      webhookData = JSON.parse(requestBody);
    }
    
    console.log('CloudPayments webhook data:', JSON.stringify(webhookData));
    
    const supabaseServiceRole = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    
    const transactionId = webhookData.TransactionId;
    const amount = parseFloat(webhookData.Amount);
    const status = webhookData.Status; // Completed, Authorized, etc.
    const accountId = webhookData.AccountId; // user_id
    const dataJson = webhookData.Data; // JSON string with metadata
    
    let metadata: any = {};
    try {
      metadata = dataJson ? JSON.parse(dataJson) : {};
    } catch {
      console.warn('Failed to parse Data field:', dataJson);
    }
    
    const userId = metadata.user_id || accountId;
    const packageName = metadata.package_name || 'unknown';
    const tokensAmount = parseInt(metadata.tokens_amount) || 0;
    const promoCode = metadata.promo_code || '';
    const promoType = metadata.promo_type || '';
    const promoValue = metadata.promo_value || '';
    
    // Determine notification type from URL path or Status field
    const url = new URL(req.url);
    const notificationType = url.searchParams.get('type') || 'pay';
    
    if (notificationType === 'pay' || status === 'Completed' || status === 'Authorized') {
      console.log(`Processing successful CloudPayments payment: ${transactionId}`);
      
      // Check if payment already exists (idempotency)
      const { data: existingPayment } = await supabaseServiceRole
        .from('payments')
        .select('id, status')
        .eq('external_payment_id', String(transactionId))
        .maybeSingle();
      
      if (existingPayment?.status === 'succeeded') {
        console.log(`Payment ${transactionId} already processed`);
        return new Response(JSON.stringify({ code: 0 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      
      if (existingPayment) {
        // Update existing pending payment
        const { error: updateError } = await supabaseServiceRole
          .from('payments')
          .update({
            status: 'succeeded',
            confirmed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingPayment.id);
        
        if (updateError) {
          console.error('Error updating payment:', updateError);
          throw new Error(`Database error: ${updateError.message}`);
        }
      } else {
        // Create new payment record
        const { error: insertError } = await supabaseServiceRole
          .from('payments')
          .insert({
            user_id: userId,
            yookassa_payment_id: null,
            external_payment_id: String(transactionId),
            payment_provider: 'cloudpayments',
            amount: amount,
            currency: 'RUB',
            status: 'succeeded',
            tokens_amount: tokensAmount,
            package_name: packageName,
            confirmed_at: new Date().toISOString(),
            metadata: {
              transaction_id: transactionId,
              promo: promoCode ? { code: promoCode, type: promoType, value: promoValue } : null
            }
          });
        
        if (insertError) {
          console.error('Error inserting payment:', insertError);
          throw new Error(`Database error: ${insertError.message}`);
        }
      }
      
      // Credit tokens to user
      if (userId && tokensAmount > 0) {
        // Update balance
        const { data: profile } = await supabaseServiceRole
          .from('profiles')
          .select('tokens_balance')
          .eq('id', userId)
          .single();
        
        if (profile) {
          const newBalance = (profile.tokens_balance || 0) + tokensAmount;
          await supabaseServiceRole
            .from('profiles')
            .update({ tokens_balance: newBalance, updated_at: new Date().toISOString() })
            .eq('id', userId);
          
          // Record token transaction
          await supabaseServiceRole
            .from('token_transactions')
            .insert({
              user_id: userId,
              amount: tokensAmount,
              transaction_type: 'purchase',
              description: `Пополнение: ${packageName} (CloudPayments)`
            });
          
          // Create notification
          await supabaseServiceRole
            .from('notifications')
            .insert({
              user_id: userId,
              title: 'Оплата прошла успешно',
              message: `Начислено ${tokensAmount} токенов (${packageName})`,
              type: 'success'
            });
          
          console.log(`Credited ${tokensAmount} tokens to user ${userId}`);
        }
        
        // Handle promo code usage increment
        if (promoCode) {
          await supabaseServiceRole
            .from('promocodes')
            .update({ current_uses: undefined }) // will be handled by RPC if available
            .eq('code', promoCode);
        }
        
        // Handle partner commissions
        const { data: referral } = await supabaseServiceRole
          .from('partner_referrals')
          .select('id, partner_id')
          .eq('referred_user_id', userId)
          .maybeSingle();
        
        if (referral) {
          const { data: partner } = await supabaseServiceRole
            .from('partner_profiles')
            .select('id, commission_rate')
            .eq('id', referral.partner_id)
            .single();
          
          if (partner) {
            const commissionAmount = amount * (partner.commission_rate / 100);
            
            // Get payment id
            const { data: paymentRecord } = await supabaseServiceRole
              .from('payments')
              .select('id')
              .eq('external_payment_id', String(transactionId))
              .single();
            
            if (paymentRecord) {
              await supabaseServiceRole
                .from('partner_commissions')
                .insert({
                  partner_id: partner.id,
                  referral_id: referral.id,
                  payment_id: paymentRecord.id,
                  payment_amount: amount,
                  commission_rate: partner.commission_rate,
                  commission_amount: commissionAmount,
                });
              
              await supabaseServiceRole
                .from('partner_profiles')
                .update({
                  total_earned: partner.commission_rate, // will be summed by trigger
                  current_balance: commissionAmount,
                })
                .eq('id', partner.id);
            }
          }
        }
      }
      
      // Log success
      const forwardedFor = req.headers.get('x-forwarded-for');
      const clientIP = forwardedFor ? forwardedFor.split(',')[0].trim() : req.headers.get('x-real-ip');
      await supabaseServiceRole.rpc('log_security_event', {
        user_id_param: userId,
        event_type_param: 'cloudpayments_payment_success',
        event_description_param: `CloudPayments payment ${transactionId} processed, ${tokensAmount} tokens credited`,
        ip_address_param: clientIP,
        user_agent_param: req.headers.get('user-agent'),
        metadata_param: { transactionId, amount, tokensAmount, packageName }
      });
      
      // Return success
      return new Response(JSON.stringify({ code: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
      
    } else if (notificationType === 'fail') {
      console.log(`Processing failed CloudPayments payment: ${transactionId}`);
      
      // Update payment status if exists
      if (transactionId) {
        await supabaseServiceRole
          .from('payments')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('external_payment_id', String(transactionId));
      }
      
      const forwardedFor = req.headers.get('x-forwarded-for');
      const clientIP = forwardedFor ? forwardedFor.split(',')[0].trim() : req.headers.get('x-real-ip');
      await supabaseServiceRole.rpc('log_security_event', {
        user_id_param: userId || null,
        event_type_param: 'cloudpayments_payment_failed',
        event_description_param: `CloudPayments payment failed: ${webhookData.Reason || 'unknown reason'}`,
        ip_address_param: clientIP,
        user_agent_param: req.headers.get('user-agent'),
        metadata_param: { transactionId, reason: webhookData.Reason }
      });
      
      return new Response(JSON.stringify({ code: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    
    // Unknown notification type
    return new Response(JSON.stringify({ code: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
    
  } catch (error) {
    console.error('Error in cloudpayments-webhook:', error);
    
    // Return code 0 anyway to prevent CloudPayments from retrying indefinitely
    // but log the error
    try {
      const supabaseServiceRole = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );
      const forwardedFor = req.headers.get('x-forwarded-for');
      const clientIP = forwardedFor ? forwardedFor.split(',')[0].trim() : req.headers.get('x-real-ip');
      await supabaseServiceRole.rpc('log_security_event', {
        user_id_param: null,
        event_type_param: 'cloudpayments_webhook_error',
        event_description_param: `Webhook processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ip_address_param: clientIP,
        user_agent_param: req.headers.get('user-agent'),
        metadata_param: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    return new Response(JSON.stringify({ code: 13 }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
