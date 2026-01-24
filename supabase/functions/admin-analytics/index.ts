import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Функция для получения всех записей с пагинацией (обход лимита 1000)
async function fetchAllRows(supabase: any, table: string, selectFields: string, filters?: { field: string, op: string, value: any }[]) {
  const allData: any[] = []
  const pageSize = 1000
  let offset = 0
  let hasMore = true

  while (hasMore) {
    let query = supabase.from(table).select(selectFields).range(offset, offset + pageSize - 1)
    
    if (filters) {
      for (const filter of filters) {
        if (filter.op === 'eq') {
          query = query.eq(filter.field, filter.value)
        } else if (filter.op === 'gte') {
          query = query.gte(filter.field, filter.value)
        }
      }
    }

    const { data, error } = await query
    
    if (error) {
      console.error(`Error fetching ${table}:`, error)
      break
    }

    if (data && data.length > 0) {
      allData.push(...data)
      offset += pageSize
      hasMore = data.length === pageSize
    } else {
      hasMore = false
    }
  }

  return allData
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
        // Исправлено: берем полный месяц назад, а не с 1-го числа текущего месяца
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        groupFormat = 'day'
        break
      case '3months':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        groupFormat = 'week'
        break
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
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
        const dayOfWeek = weekStart.getDay()
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        weekStart.setDate(weekStart.getDate() + diff)
        timeIntervals.push(weekStart.toISOString().slice(0, 10))
        current.setDate(current.getDate() + 7)
      } else if (groupFormat === 'month') {
        timeIntervals.push(current.toISOString().slice(0, 7) + '-01')
        current.setMonth(current.getMonth() + 1)
      }
    }

    // Получаем данные о пользователях за период (с пагинацией)
    const usersData = await fetchAllRows(supabase, 'profiles', 'id, created_at', [
      { field: 'created_at', op: 'gte', value: startDate.toISOString() }
    ])

    // Получаем общее количество пользователей для расчета конверсии
    const { count: totalUsersCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })

    // Получаем данные о генерациях (с пагинацией)
    const generationsData = await fetchAllRows(supabase, 'generations', 'created_at', [
      { field: 'created_at', op: 'gte', value: startDate.toISOString() }
    ])

    // Получаем данные о токенах (расход) (с пагинацией)
    const tokensData = await fetchAllRows(supabase, 'token_transactions', 'created_at, amount', [
      { field: 'transaction_type', op: 'eq', value: 'generation' },
      { field: 'created_at', op: 'gte', value: startDate.toISOString() }
    ])

    // Получаем данные о платежах за период (с пагинацией)
    const paymentsData = await fetchAllRows(supabase, 'payments', 'id, user_id, created_at, amount', [
      { field: 'status', op: 'eq', value: 'succeeded' },
      { field: 'created_at', op: 'gte', value: startDate.toISOString() }
    ])

    // Получаем ВСЕ успешные платежи для расчета повторных оплат и платящих пользователей (с пагинацией)
    const allPaymentsData = await fetchAllRows(supabase, 'payments', 'id, user_id, amount', [
      { field: 'status', op: 'eq', value: 'succeeded' }
    ])

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
          const dayOfWeek = weekStart.getDay()
          const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
          weekStart.setDate(weekStart.getDate() + diff)
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

    // Получаем ОБЩИЕ totals (за всё время для основных метрик, за период для отображения)
    const totalUsersInPeriod = usersData?.length || 0
    const totalGenerationsInPeriod = generationsData?.length || 0
    const totalTokensSpentInPeriod = tokensData?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0
    const totalRevenueInPeriod = paymentsData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

    // Расчет новых метрик
    // 1. Платные пользователи (уникальные user_id с платежами)
    const paidUsersSet = new Set<string>()
    allPaymentsData?.forEach(p => {
      if (p.user_id) paidUsersSet.add(p.user_id)
    })
    const paidUsersCount = paidUsersSet.size

    // Платные пользователи за период
    const periodPaidUsersSet = new Set<string>()
    paymentsData?.forEach(p => {
      if (p.user_id) periodPaidUsersSet.add(p.user_id)
    })
    const periodPaidUsersCount = periodPaidUsersSet.size

    // 2. Средний чек
    const totalPaymentsCount = allPaymentsData?.length || 0
    const totalPaymentsSum = allPaymentsData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
    const averageCheck = totalPaymentsCount > 0 ? Math.round(totalPaymentsSum / totalPaymentsCount) : 0

    // Средний чек за период
    const periodPaymentsCount = paymentsData?.length || 0
    const periodAverageCheck = periodPaymentsCount > 0 ? Math.round(totalRevenueInPeriod / periodPaymentsCount) : 0

    // 3. Повторные оплаты (пользователи с более чем 1 платежом)
    const userPaymentCounts: { [key: string]: number } = {}
    allPaymentsData?.forEach(p => {
      if (p.user_id) {
        userPaymentCounts[p.user_id] = (userPaymentCounts[p.user_id] || 0) + 1
      }
    })
    const repeatPaymentUsers = Object.values(userPaymentCounts).filter(count => count > 1).length
    const totalRepeatPayments = Object.entries(userPaymentCounts)
      .reduce((sum, [_, count]) => sum + (count > 1 ? count - 1 : 0), 0)

    // Повторные за период (пользователи с >1 платежом за период)
    const periodUserPaymentCounts: { [key: string]: number } = {}
    paymentsData?.forEach(p => {
      if (p.user_id) {
        periodUserPaymentCounts[p.user_id] = (periodUserPaymentCounts[p.user_id] || 0) + 1
      }
    })
    const periodRepeatPaymentUsers = Object.values(periodUserPaymentCounts).filter(count => count > 1).length
    const periodRepeatPayments = Object.entries(periodUserPaymentCounts)
      .reduce((sum, [_, count]) => sum + (count > 1 ? count - 1 : 0), 0)

    // Расчет конверсии за период (платящие за период / зарегистрированные за период)
    const periodConversionRate = totalUsersInPeriod > 0 
      ? Math.round((periodPaidUsersCount / totalUsersInPeriod) * 1000) / 10 
      : 0

    // Расчет % повторных оплат за период (повторно платящие / платящие за период)
    const periodRepeatPaymentRate = periodPaidUsersCount > 0 
      ? Math.round((periodRepeatPaymentUsers / periodPaidUsersCount) * 1000) / 10 
      : 0

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
          users: totalUsersInPeriod,
          generations: totalGenerationsInPeriod,
          tokens: totalTokensSpentInPeriod,
          revenue: totalRevenueInPeriod
        },
        // Новые метрики
        additionalMetrics: {
          paidUsers: periodPaidUsersCount,
          paidUsersTotal: paidUsersCount,
          averageCheck: periodAverageCheck,
          averageCheckTotal: averageCheck,
          repeatPayments: periodRepeatPayments,
          repeatPaymentsTotal: totalRepeatPayments,
          repeatPaymentUsers: repeatPaymentUsers,
          // Метрики за период
          periodRepeatPaymentUsers: periodRepeatPaymentUsers,
          periodUsersTotal: totalUsersInPeriod,
          totalUsers: totalUsersCount || 0,
          // Проценты за период
          conversionRate: periodConversionRate,
          conversionRateTotal: (totalUsersCount && totalUsersCount > 0) 
            ? Math.round((paidUsersCount / totalUsersCount) * 1000) / 10 
            : 0,
          repeatPaymentRate: periodRepeatPaymentRate,
          repeatPaymentRateTotal: paidUsersCount > 0 
            ? Math.round((repeatPaymentUsers / paidUsersCount) * 1000) / 10 
            : 0
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
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
