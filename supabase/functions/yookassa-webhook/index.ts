import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const webhookData = JSON.parse(requestBody);
    console.log('Webhook event:', webhookData.event);

    const { event, object: paymentObject } = webhookData;

    if (event === 'payment.succeeded') {
      const paymentId = paymentObject.id;
      console.log(`Processing successful payment: ${paymentId}`);

      const { data, error } = await supabaseServiceRole.rpc('process_payment_success', {
        payment_id_param: paymentId,
        external_id_param: null,
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

      // Get payment record to find user_id for notification
      const { data: canceledPayment } = await supabaseServiceRole
        .from('payments')
        .select('user_id, package_name')
        .eq('yookassa_payment_id', paymentId)
        .single();

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

      // Send notification to user about canceled payment
      if (canceledPayment?.user_id) {
        await supabaseServiceRole
          .from('notifications')
          .insert({
            user_id: canceledPayment.user_id,
            title: 'Оплата отменена',
            message: `Платёж за "${canceledPayment.package_name || 'пакет'}" был отменён`,
            type: 'payment_failed',
          });
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
