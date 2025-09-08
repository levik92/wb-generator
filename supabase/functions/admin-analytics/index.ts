import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { period } = await req.json()

    // Определяем временные рамки
    const now = new Date()
    let startDate: Date
    let groupFormat: string

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        groupFormat = 'hour'
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        groupFormat = 'day'
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        groupFormat = 'day'
        break
      case '3months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        groupFormat = 'week'
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        groupFormat = 'month'
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        groupFormat = 'day'
    }

    // Генерируем временные интервалы для графика
    const timeIntervals: string[] = []
    const current = new Date(startDate)
    
    while (current <= now) {
      if (groupFormat === 'hour') {
        timeIntervals.push(current.toISOString().slice(0, 13) + ':00:00.000Z')
        current.setHours(current.getHours() + 1)
      } else if (groupFormat === 'day') {
        timeIntervals.push(current.toISOString().slice(0, 10))
        current.setDate(current.getDate() + 1)
      } else if (groupFormat === 'week') {
        // Начало недели (понедельник)
        const weekStart = new Date(current)
        weekStart.setDate(current.getDate() - current.getDay() + 1)
        timeIntervals.push(weekStart.toISOString().slice(0, 10))
        current.setDate(current.getDate() + 7)
      } else if (groupFormat === 'month') {
        timeIntervals.push(current.toISOString().slice(0, 7) + '-01')
        current.setMonth(current.getMonth() + 1)
      }
    }

    // Получаем данные о пользователях
    const { data: usersData } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', startDate.toISOString())

    // Получаем данные о генерациях
    const { data: generationsData } = await supabase
      .from('generations')
      .select('created_at')
      .gte('created_at', startDate.toISOString())

    // Получаем данные о токенах
    const { data: tokensData } = await supabase
      .from('token_transactions')
      .select('created_at, amount')
      .eq('transaction_type', 'generation')
      .gte('created_at', startDate.toISOString())

    // Получаем данные о платежах
    const { data: paymentsData } = await supabase
      .from('payments')
      .select('created_at, amount')
      .eq('status', 'succeeded')
      .gte('created_at', startDate.toISOString())

    // Группируем данные по временным интервалам
    const groupData = (data: any[], dateField: string, valueField?: string) => {
      const grouped: { [key: string]: number } = {}
      
      timeIntervals.forEach(interval => {
        grouped[interval] = 0
      })

      data?.forEach(item => {
        const itemDate = new Date(item[dateField])
        let key: string

        if (groupFormat === 'hour') {
          key = itemDate.toISOString().slice(0, 13) + ':00:00.000Z'
        } else if (groupFormat === 'day') {
          key = itemDate.toISOString().slice(0, 10)
        } else if (groupFormat === 'week') {
          const weekStart = new Date(itemDate)
          weekStart.setDate(itemDate.getDate() - itemDate.getDay() + 1)
          key = weekStart.toISOString().slice(0, 10)
        } else if (groupFormat === 'month') {
          key = itemDate.toISOString().slice(0, 7) + '-01'
        } else {
          key = itemDate.toISOString().slice(0, 10)
        }

        if (grouped.hasOwnProperty(key)) {
          if (valueField) {
            grouped[key] += Math.abs(Number(item[valueField]))
          } else {
            grouped[key] += 1
          }
        }
      })

      return timeIntervals.map(interval => ({
        date: interval,
        value: grouped[interval] || 0
      }))
    }

    // Формируем данные для графиков
    const usersChart = groupData(usersData || [], 'created_at')
    const generationsChart = groupData(generationsData || [], 'created_at')
    const tokensChart = groupData(tokensData || [], 'created_at', 'amount')
    const revenueChart = groupData(paymentsData || [], 'created_at', 'amount')

    // Получаем общую статистику
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    const { count: totalGenerations } = await supabase
      .from('generations')
      .select('*', { count: 'exact', head: true })

    const { data: allTokensData } = await supabase
      .from('token_transactions')
      .select('amount')
      .eq('transaction_type', 'generation')

    const totalTokensSpent = allTokensData?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0

    const { data: allRevenueData } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'succeeded')

    const totalRevenue = allRevenueData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

    return new Response(
      JSON.stringify({
        period,
        groupFormat,
        charts: {
          users: usersChart,
          generations: generationsChart,
          tokens: tokensChart,
          revenue: revenueChart
        },
        totals: {
          users: totalUsers || 0,
          generations: totalGenerations || 0,
          tokens: totalTokensSpent,
          revenue: totalRevenue
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in admin-analytics function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})