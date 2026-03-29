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
    console.log('Starting cleanup of stale pending payments...');

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Find and expire payments stuck in 'pending' for more than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: stalePayments, error: selectError } = await supabase
      .from('payments')
      .select('id, user_id, amount, package_name, created_at')
      .eq('status', 'pending')
      .lt('created_at', oneHourAgo);

    if (selectError) {
      console.error('Error fetching stale payments:', selectError);
      throw new Error(`Select error: ${selectError.message}`);
    }

    const count = stalePayments?.length ?? 0;
    console.log(`Found ${count} stale pending payments to expire`);

    if (count > 0) {
      const staleIds = stalePayments!.map(p => p.id);

      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString(),
        })
        .in('id', staleIds);

      if (updateError) {
        console.error('Error expiring stale payments:', updateError);
        throw new Error(`Update error: ${updateError.message}`);
      }

      console.log(`Successfully expired ${count} stale payments`);

      // Log the cleanup event
      await supabase.rpc('log_security_event', {
        user_id_param: null,
        event_type_param: 'stale_payments_cleanup',
        event_description_param: `Expired ${count} stale pending payments`,
        ip_address_param: null,
        user_agent_param: 'cleanup-stale-payments',
        metadata_param: {
          count,
          oldest: stalePayments![stalePayments!.length - 1]?.created_at,
          timestamp: new Date().toISOString(),
        },
      });
    }

    return new Response(
      JSON.stringify({ success: true, expired_count: count }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in cleanup-stale-payments:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
