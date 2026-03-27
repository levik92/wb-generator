import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
    
    // Parse the webhook body
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
    const status = webhookData.Status;
    const dataJson = webhookData.Data || webhookData.JsonData;
    const userId = webhookData.AccountId;
    const invoiceId = webhookData.InvoiceId; // maps to externalId from widget.start()
    
    let metadata: any = {};
    try {
      metadata = dataJson ? (typeof dataJson === 'string' ? JSON.parse(dataJson) : dataJson) : {};
    } catch {
      console.warn('Failed to parse Data field:', dataJson);
    }
    
    // Get external_payment_id: first from metadata, then fallback to InvoiceId (externalId from widget)
    const externalPaymentId = metadata.external_payment_id || invoiceId || null;
    
    const url = new URL(req.url);
    const notificationType = url.searchParams.get('type') || 'pay';
    
    if (notificationType === 'pay' || status === 'Completed' || status === 'Authorized') {
      console.log(`Processing successful CloudPayments payment: ${transactionId}, externalPaymentId: ${externalPaymentId}`);
      
      if (externalPaymentId) {
        // Use process_payment_success RPC which handles:
        // - Token crediting (with bypass_token_protection)
        // - Payment status update
        // - Token transaction logging
        // - Notification creation
        // - Promo code usage increment
        // Partner commissions are handled by the process_partner_commission trigger
        const { data: result, error: rpcError } = await supabaseServiceRole.rpc('process_payment_success', {
          payment_id_param: null,
          external_id_param: externalPaymentId,
        });
        
        if (rpcError) {
          console.error('process_payment_success RPC error:', rpcError);
          throw new Error(`RPC error: ${rpcError.message}`);
        }
        
        if (!result) {
          console.warn(`No pending payment found for external_payment_id: ${externalPaymentId}. May already be processed.`);
        } else {
          console.log(`Payment processed successfully via RPC for ${externalPaymentId}`);
        }
      } else {
        console.warn('No external_payment_id in webhook data, cannot process payment');
      }
      
      // Log success
      const forwardedFor = req.headers.get('x-forwarded-for');
      const clientIP = forwardedFor ? forwardedFor.split(',')[0].trim() : req.headers.get('x-real-ip');
      await supabaseServiceRole.rpc('log_security_event', {
        user_id_param: userId || null,
        event_type_param: 'cloudpayments_payment_success',
        event_description_param: `CloudPayments payment ${transactionId} processed`,
        ip_address_param: clientIP,
        user_agent_param: req.headers.get('user-agent'),
        metadata_param: { transactionId, externalPaymentId }
      });
      
      return new Response(JSON.stringify({ code: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
      
    } else if (notificationType === 'fail') {
      console.log(`Processing failed CloudPayments payment: ${transactionId}`);
      
      // Update payment status if we have external_payment_id
      if (externalPaymentId) {
        await supabaseServiceRole
          .from('payments')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('external_payment_id', externalPaymentId);
      }
      
      const forwardedFor = req.headers.get('x-forwarded-for');
      const clientIP = forwardedFor ? forwardedFor.split(',')[0].trim() : req.headers.get('x-real-ip');
      await supabaseServiceRole.rpc('log_security_event', {
        user_id_param: userId || null,
        event_type_param: 'cloudpayments_payment_failed',
        event_description_param: `CloudPayments payment failed: ${webhookData.Reason || 'unknown reason'}`,
        ip_address_param: clientIP,
        user_agent_param: req.headers.get('user-agent'),
        metadata_param: { transactionId, reason: webhookData.Reason, externalPaymentId }
      });
      
      return new Response(JSON.stringify({ code: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    
    return new Response(JSON.stringify({ code: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
    
  } catch (error) {
    console.error('Error in cloudpayments-webhook:', error);
    
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