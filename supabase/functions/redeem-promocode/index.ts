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
    // Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Не авторизован' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Verify user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''))
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Не авторизован' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const userId = claimsData.claims.sub as string

    // Parse body
    const { code } = await req.json()
    if (!code || typeof code !== 'string' || code.trim().length === 0 || code.trim().length > 50) {
      return new Response(JSON.stringify({ error: 'Некорректный промокод' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const sanitizedCode = code.trim().toUpperCase()
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Find promo code
    const { data: promo, error: promoError } = await adminClient
      .from('promocodes')
      .select('id, code, type, value, max_uses, current_uses, valid_until, is_active')
      .eq('code', sanitizedCode)
      .eq('is_active', true)
      .single()

    if (promoError || !promo) {
      return new Response(JSON.stringify({ error: 'Промокод не найден или неактивен' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Only tokens type
    if (promo.type !== 'tokens') {
      return new Response(JSON.stringify({ error: 'Этот промокод нельзя активировать здесь' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check expiration
    if (promo.valid_until && new Date(promo.valid_until) < new Date()) {
      return new Response(JSON.stringify({ error: 'Промокод истёк' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check usage limit
    if (promo.max_uses && (promo.current_uses ?? 0) >= promo.max_uses) {
      return new Response(JSON.stringify({ error: 'Лимит использований промокода исчерпан' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check if user already used this promo (unique index will also catch this)
    const { data: existingUse } = await adminClient
      .from('promocode_uses')
      .select('id')
      .eq('promocode_id', promo.id)
      .eq('user_id', userId)
      .maybeSingle()

    if (existingUse) {
      return new Response(JSON.stringify({ error: 'Вы уже использовали этот промокод' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Record usage (unique index prevents race conditions)
    const { error: useError } = await adminClient
      .from('promocode_uses')
      .insert({ promocode_id: promo.id, user_id: userId })

    if (useError) {
      if (useError.code === '23505') { // unique violation
        return new Response(JSON.stringify({ error: 'Вы уже использовали этот промокод' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      throw useError
    }

    // Increment current_uses
    await adminClient
      .from('promocodes')
      .update({ current_uses: (promo.current_uses ?? 0) + 1 })
      .eq('id', promo.id)

    // Credit tokens using bypass_token_protection
    const tokensToAdd = promo.value
    await adminClient.rpc('set_config', { parameter: 'app.bypass_token_protection', value: 'true' })

    const { data: profile } = await adminClient
      .from('profiles')
      .select('tokens_balance')
      .eq('id', userId)
      .single()

    const currentBalance = profile?.tokens_balance ?? 0

    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ tokens_balance: currentBalance + tokensToAdd })
      .eq('id', userId)

    if (updateError) {
      console.error('Failed to update balance:', updateError)
      // Try SQL approach with bypass flag
      const { error: rpcError } = await adminClient.rpc('admin_update_user_tokens', {
        target_user_id: userId,
        new_balance: currentBalance + tokensToAdd,
        reason: `Активация промокода ${sanitizedCode}`
      })
      if (rpcError) throw rpcError
    }

    // Record transaction for audit
    await adminClient
      .from('token_transactions')
      .insert({
        user_id: userId,
        amount: tokensToAdd,
        transaction_type: 'promocode_redeem',
        description: `Активация промокода ${sanitizedCode}: +${tokensToAdd} токенов`
      })

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
