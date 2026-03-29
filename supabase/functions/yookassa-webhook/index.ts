import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// YooKassa webhook IPs: 185.71.76.0/27, 185.71.77.0/27, 77.75.153.0/25, 77.75.154.0/25
function isYooKassaIP(ip: string | null): boolean {
  if (!ip) return false;
  return (
    ip.startsWith('185.71.76.') ||
    ip.startsWith('185.71.77.') ||
    ip.startsWith('77.75.153.') ||
    ip.startsWith('77.75.154.')
  );
}

async function verifyWebhookSignature(requestBody: string, signature: string | null): Promise<boolean> {
  if (!signature) return false;

  const secretKey = Deno.env.get("YOOKASSA_SECRET_KEY");
  if (!secretKey) {
    console.error('YOOKASSA_SECRET_KEY not configured');
    return false;
  }

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secretKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const data = new TextEncoder().encode(requestBody);
    const expectedSignature = await crypto.subtle.sign("HMAC", key, data);
    const expectedSignatureHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const providedSig = signature.toLowerCase().replace(/^sha256=/, '');
    const expectedSig = expectedSignatureHex.toLowerCase();

    if (providedSig.length !== expectedSig.length) return false;

    let result = 0;
    for (let i = 0; i < providedSig.length; i++) {
      result |= providedSig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
    }
    return result === 0;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

function getClientIP(req: Request): string | null {
  const forwardedFor = req.headers.get('X-Forwarded-For');
  return req.headers.get('CF-Connecting-IP') ||
    (forwardedFor ? forwardedFor.split(',')[0].trim() : null) ||
    req.headers.get('X-Real-IP');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseServiceRole = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    console.log('ЮKassa webhook received');

    const requestBody = await req.text();
    const clientIP = getClientIP(req);
    console.log('Webhook from IP:', clientIP);

    // Security: verify request origin
    const webhookSignature = req.headers.get('X-Webhook-Signature') ||
      req.headers.get('Content-HMAC');
    const signatureValid = await verifyWebhookSignature(requestBody, webhookSignature);
    const ipValid = isYooKassaIP(clientIP);

    // Block if BOTH signature and IP checks fail
    if (!signatureValid && !ipValid) {
      console.error('Webhook blocked: invalid signature AND unexpected IP:', clientIP);
      await supabaseServiceRole.rpc('log_security_event', {
        user_id_param: null,
        event_type_param: 'webhook_blocked',
        event_description_param: 'YooKassa webhook blocked: invalid signature and unexpected IP',
        ip_address_param: clientIP,
        user_agent_param: req.headers.get('User-Agent'),
        metadata_param: {
          ip: clientIP,
          has_signature: !!webhookSignature,
          timestamp: new Date().toISOString()
        }
      });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log warning if only one check passed
    if (!signatureValid || !ipValid) {
      console.warn(`Webhook partially verified: signature=${signatureValid}, ip=${ipValid}`);
      await supabaseServiceRole.rpc('log_security_event', {
        user_id_param: null,
        event_type_param: 'webhook_partial_verification',
        event_description_param: `YooKassa webhook: signature=${signatureValid}, ip_valid=${ipValid}`,
        ip_address_param: clientIP,
        user_agent_param: req.headers.get('User-Agent'),
        metadata_param: { ip: clientIP, signatureValid, ipValid }
      });
    }

    const webhookData = JSON.parse(requestBody);
    console.log('Webhook event:', webhookData.event);

    const { event, object: paymentObject } = webhookData;

    if (event === 'payment.succeeded') {
      const paymentId = paymentObject.id;
      console.log(`Processing successful payment: ${paymentId}`);

      const { data, error } = await supabaseServiceRole.rpc('process_payment_success', {
        payment_id_param: paymentId
      });

      if (error) {
        console.error('Error processing payment success:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) {
        console.log(`Payment ${paymentId} not found or already processed`);
      } else {
        console.log(`Successfully processed payment ${paymentId}`);
        await supabaseServiceRole.rpc('log_security_event', {
          user_id_param: null,
          event_type_param: 'payment_webhook_success',
          event_description_param: `Payment ${paymentId} processed successfully`,
          ip_address_param: clientIP,
          user_agent_param: req.headers.get('User-Agent'),
          metadata_param: { paymentId, amount: paymentObject.amount }
        });
      }

    } else if (event === 'payment.canceled') {
      const paymentId = paymentObject.id;
      console.log(`Processing canceled payment: ${paymentId}`);

      const { error } = await supabaseServiceRole
        .from('payments')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString()
        })
        .eq('yookassa_payment_id', paymentId);

      if (error) {
        console.error('Error updating canceled payment:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log(`Payment ${paymentId} marked as canceled`);
      await supabaseServiceRole.rpc('log_security_event', {
        user_id_param: null,
        event_type_param: 'payment_canceled',
        event_description_param: `Payment ${paymentId} was canceled`,
        ip_address_param: clientIP,
        user_agent_param: req.headers.get('User-Agent'),
        metadata_param: { paymentId }
      });

    } else {
      console.log(`Unhandled event: ${event}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in yookassa-webhook function:', error);

    try {
      const clientIP = getClientIP(req);
      await supabaseServiceRole.rpc('log_security_event', {
        user_id_param: null,
        event_type_param: 'webhook_processing_error',
        event_description_param: `Webhook processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ip_address_param: clientIP,
        user_agent_param: req.headers.get('User-Agent'),
        metadata_param: { error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date().toISOString() }
      });
    } catch (logError) {
      console.error('Failed to log webhook error:', logError);
    }

    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
