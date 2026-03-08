import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Не авторизован' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const token = authHeader.replace('Bearer ', '')
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    const { data: { user }, error: userError } = await adminClient.auth.getUser(token)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Не авторизован' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const userId = user.id

    const { code } = await req.json()
    if (!code || typeof code !== 'string' || code.trim().length === 0 || code.trim().length > 50) {
      return new Response(JSON.stringify({ error: 'Некорректный промокод' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const sanitizedCode = code.trim().toUpperCase()

    // Find promo code
    const { data: promo, error: promoError } = await adminClient
      .from('promocodes')
      .select('id, code, type, value, max_uses, current_uses, valid_until, is_active, max_uses_per_user')
      .eq('code', sanitizedCode)
      .eq('is_active', true)
      .single()

    if (promoError || !promo) {
      return new Response(JSON.stringify({ error: 'Промокод не найден или неактивен' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Only tokens_instant type allowed here
    if (promo.type !== 'tokens_instant') {
      return new Response(JSON.stringify({ error: 'Этот промокод применяется при оплате' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check expiration
    if (promo.valid_until && new Date(promo.valid_until) < new Date()) {
      return new Response(JSON.stringify({ error: 'Промокод истёк' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check global usage limit
    if (promo.max_uses && (promo.current_uses ?? 0) >= promo.max_uses) {
      return new Response(JSON.stringify({ error: 'Лимит использований промокода исчерпан' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check per-user usage limit (for tokens_instant always 1)
    const maxPerUser = promo.max_uses_per_user ?? 1 // tokens_instant defaults to 1
    const { count: userUseCount } = await adminClient
      .from('promocode_uses')
      .select('id', { count: 'exact', head: true })
      .eq('promocode_id', promo.id)
      .eq('user_id', userId)

    if ((userUseCount ?? 0) >= maxPerUser) {
      return new Response(JSON.stringify({ error: 'Вы уже использовали этот промокод' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Record usage
    const { error: useError } = await adminClient
      .from('promocode_uses')
      .insert({ promocode_id: promo.id, user_id: userId })

    if (useError) {
      if (useError.code === '23505') {
        return new Response(JSON.stringify({ error: 'Вы уже использовали этот промокод' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      throw useError
    }

    // Increment current_uses
    await adminClient
      .from('promocodes')
      .update({ current_uses: (promo.current_uses ?? 0) + 1 })
      .eq('id', promo.id)

    // Credit tokens atomically via SECURITY DEFINER function
    const tokensToAdd = promo.value
    const { error: redeemError } = await adminClient.rpc('redeem_promocode_tokens', {
      p_user_id: userId,
      p_amount: tokensToAdd,
      p_code: sanitizedCode
    })

    if (redeemError) {
      console.error('Failed to redeem tokens:', redeemError)
      throw redeemError
    }

    return new Response(JSON.stringify({
      success: true,
      tokens_awarded: tokensToAdd,
      message: `Промокод активирован! Начислено ${tokensToAdd} токенов`
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('Error in redeem-promocode:', error)
    return new Response(JSON.stringify({ error: 'Внутренняя ошибка сервера' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
