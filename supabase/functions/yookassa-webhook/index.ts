import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('ЮKassa webhook received');
    
    const supabaseServiceRole = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const webhookData = await req.json();
    console.log('Webhook data:', JSON.stringify(webhookData, null, 2));

    const { event, object: paymentObject } = webhookData;
    
    if (event === 'payment.succeeded') {
      const paymentId = paymentObject.id;
      console.log(`Processing successful payment: ${paymentId}`);
      
      // Call the database function to process payment success
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
      }
      
    } else if (event === 'payment.canceled') {
      const paymentId = paymentObject.id;
      console.log(`Processing canceled payment: ${paymentId}`);
      
      // Update payment status to canceled
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
      
    } else {
      console.log(`Unhandled event: ${event}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in yookassa-webhook function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});