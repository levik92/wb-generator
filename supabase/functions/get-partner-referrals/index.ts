import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  partnerId: string;
}

function maskEmail(email: string | null | undefined) {
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  return `${local.charAt(0)}***@${domain}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { partnerId }: RequestBody = await req.json();
    if (!partnerId) {
      return new Response(JSON.stringify({ error: 'partnerId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Verify partner ownership
    const { data: partner, error: partnerErr } = await supabaseClient
      .from('partner_profiles')
      .select('id, user_id')
      .eq('id', partnerId)
      .maybeSingle();

    if (partnerErr || !partner || partner.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Load referrals
    const { data: referrals, error: refErr } = await supabaseClient
      .from('partner_referrals')
      .select('*')
      .eq('partner_id', partnerId)
      .order('registered_at', { ascending: false });

    if (refErr) {
      console.error('Error fetching referrals:', refErr)
      return new Response(JSON.stringify({ error: 'Failed to load referrals' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const ids = (referrals ?? []).map(r => r.referred_user_id).filter(Boolean);

    let profileMap: Record<string, { email: string | null; full_name: string | null }> = {};
    if (ids.length > 0) {
      const { data: profiles, error: profErr } = await supabaseClient
        .from('profiles')
        .select('id, email, full_name')
        .in('id', ids);
      if (profErr) {
        console.error('Error fetching profiles:', profErr)
      } else {
        profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, { email: p.email, full_name: p.full_name }]))
      }
    }

    const enriched = (referrals ?? []).map((r: any) => {
      const prof = profileMap[r.referred_user_id] || { email: null, full_name: null };
      return {
        ...r,
        masked_email: maskEmail(prof.email),
        full_name: prof.full_name,
      }
    })

    return new Response(JSON.stringify({ referrals: enriched }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('get-partner-referrals error:', e)
    return new Response(JSON.stringify({ error: 'Unexpected error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
