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

    // Verify partner ownership or admin access
    const { data: partner, error: partnerErr } = await supabaseClient
      .from('partner_profiles')
      .select('id, user_id')
      .eq('id', partnerId)
      .maybeSingle();

    if (partnerErr || !partner) {
      return new Response(JSON.stringify({ error: 'Partner not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const isOwner = partner.user_id === user.id;
    let isAdmin = false;
    if (!isOwner) {
      const { data: roleData } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      isAdmin = !!roleData;
    }

    if (!isOwner && !isAdmin) {
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
      if (!profErr && profiles) {
        profileMap = Object.fromEntries(profiles.map((p: any) => [p.id, { email: p.email, full_name: p.full_name }]))
      }
    }

    // Load commissions for this partner to get per-referral payment breakdown
    const { data: commissions } = await supabaseClient
      .from('partner_commissions')
      .select('referral_id, payment_id, payment_amount, commission_amount, commission_rate, created_at, status')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false });

    // Load actual payment details for commission records
    const paymentIds = (commissions ?? []).map(c => c.payment_id).filter(Boolean);
    let paymentMap: Record<string, { amount: number; confirmed_at: string | null; package_name: string }> = {};
    if (paymentIds.length > 0) {
      const { data: payments } = await supabaseClient
        .from('payments')
        .select('id, amount, confirmed_at, package_name')
        .in('id', paymentIds);
      if (payments) {
        paymentMap = Object.fromEntries(payments.map((p: any) => [p.id, { amount: p.amount, confirmed_at: p.confirmed_at, package_name: p.package_name }]));
      }
    }

    // Group commissions by referral_id
    const commissionsByReferral: Record<string, any[]> = {};
    for (const c of (commissions ?? [])) {
      if (!commissionsByReferral[c.referral_id]) {
        commissionsByReferral[c.referral_id] = [];
      }
      const payment = paymentMap[c.payment_id];
      commissionsByReferral[c.referral_id].push({
        payment_id: c.payment_id,
        payment_amount: Number(c.payment_amount),
        commission_amount: Number(c.commission_amount),
        commission_rate: c.commission_rate,
        date: payment?.confirmed_at || c.created_at,
        package_name: payment?.package_name || '—',
        status: c.status,
      });
    }

    const enrichedRaw = (referrals ?? []).map((r: any) => {
      const prof = profileMap[r.referred_user_id] || { email: null, full_name: null };
      return {
        ...r,
        email: isAdmin ? prof.email : null,
        masked_email: maskEmail(prof.email),
        full_name: prof.full_name,
        payments: commissionsByReferral[r.id] || [],
      }
    })

    // Server-side dedup: merge duplicate referrals for same user
    const dedupMap = new Map<string, any>();
    for (const r of enrichedRaw) {
      const existing = dedupMap.get(r.referred_user_id);
      if (!existing) {
        dedupMap.set(r.referred_user_id, { ...r, payments: [...(r.payments || [])] });
      } else {
        // Merge payments
        existing.payments = [...existing.payments, ...(r.payments || [])];
        existing.total_payments = Math.max(Number(existing.total_payments) || 0, Number(r.total_payments) || 0);
        existing.total_commission = Math.max(Number(existing.total_commission) || 0, Number(r.total_commission) || 0);
        if (r.status === 'active' && existing.status !== 'active') existing.status = 'active';
      }
    }
    const enriched = Array.from(dedupMap.values());

    return new Response(JSON.stringify({ referrals: enriched, is_admin: isAdmin }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('get-partner-referrals error:', e)
    return new Response(JSON.stringify({ error: 'Unexpected error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})