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
    // Сначала применяем фильтры, потом range для корректной пагинации
    let query = supabase.from(table).select(selectFields)
    
    if (filters) {
      for (const filter of filters) {
        if (filter.op === 'eq') {
          query = query.eq(filter.field, filter.value)
        } else if (filter.op === 'gte') {
          query = query.gte(filter.field, filter.value)
        } else if (filter.op === 'lte') {
          query = query.lte(filter.field, filter.value)
        }
      }
    }
    
    // Применяем range после фильтров
    query = query.range(offset, offset + pageSize - 1)

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

    const { period, startDateCustom, endDateCustom } = await req.json()

    // Moscow timezone offset
    const MOSCOW_OFFSET_HOURS = 3

    // Определяем временные рамки
    const now = new Date()
    let startDate: Date
    let endDate: Date = now
    let groupFormat: string

    // Если переданы кастомные даты (формат YYYY-MM-DD, интерпретируем как московское время)
    if (startDateCustom && endDateCustom) {
      // Парсим как московскую дату: 00:00 МСК = 21:00 UTC предыдущего дня
      const [sy, sm, sd] = startDateCustom.split('-').map(Number)
      const [ey, em, ed] = endDateCustom.split('-').map(Number)
      startDate = new Date(Date.UTC(sy, sm - 1, sd, 0 - MOSCOW_OFFSET_HOURS, 0, 0, 0))
      // 23:59:59.999 МСК = 20:59:59.999 UTC
      endDate = new Date(Date.UTC(ey, em - 1, ed, 23 - MOSCOW_OFFSET_HOURS, 59, 59, 999))
      
      // Определяем формат группировки в зависимости от длины периода
      const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays <= 1) {
        groupFormat = 'hour'
      } else if (diffDays <= 31) {
        groupFormat = 'day'
      } else if (diffDays <= 90) {
        groupFormat = 'week'
      } else {
        groupFormat = 'month'
      }
    } else {
      switch (period) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          groupFormat = 'hour'
          break
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          // Нормализуем к началу дня
          startDate.setUTCHours(0, 0, 0, 0)
          groupFormat = 'day'
          break
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          startDate.setUTCHours(0, 0, 0, 0)
          groupFormat = 'day'
          break
        case '3months':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          startDate.setUTCHours(0, 0, 0, 0)
          groupFormat = 'week'
          break
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          startDate.setUTCHours(0, 0, 0, 0)
          groupFormat = 'month'
          break
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          startDate.setUTCHours(0, 0, 0, 0)
          groupFormat = 'day'
      }
    }

    // Вычисляем предыдущий период для сравнения (такой же длины)
    const periodDuration = endDate.getTime() - startDate.getTime()
    const prevEndDate = new Date(startDate.getTime() - 1) // Конец предыдущего периода - за 1 мс до начала текущего
    prevEndDate.setUTCHours(23, 59, 59, 999)
    const prevStartDate = new Date(prevEndDate.getTime() - periodDuration)
    prevStartDate.setUTCHours(0, 0, 0, 0)

    // Функция для конвертации UTC даты в Moscow timezone (UTC+3)
    
    const toMoscowDate = (date: Date): Date => {
      // Добавляем 3 часа к UTC времени, чтобы получить московское время
      return new Date(date.getTime() + MOSCOW_OFFSET_HOURS * 60 * 60 * 1000)
    }
    
    const formatMoscowDate = (date: Date, format: 'hour' | 'day' | 'week' | 'month'): string => {
      const moscowDate = toMoscowDate(date)
      
      if (format === 'hour') {
        // Возвращаем ISO строку с московским часом
        const year = moscowDate.getUTCFullYear()
        const month = String(moscowDate.getUTCMonth() + 1).padStart(2, '0')
        const day = String(moscowDate.getUTCDate()).padStart(2, '0')
        const hour = String(moscowDate.getUTCHours()).padStart(2, '0')
        return `${year}-${month}-${day}T${hour}:00:00.000+03:00`
      } else if (format === 'day' || format === 'week') {
        const year = moscowDate.getUTCFullYear()
        const month = String(moscowDate.getUTCMonth() + 1).padStart(2, '0')
        const day = String(moscowDate.getUTCDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      } else if (format === 'month') {
        const year = moscowDate.getUTCFullYear()
        const month = String(moscowDate.getUTCMonth() + 1).padStart(2, '0')
        return `${year}-${month}-01`
      }
      const year = moscowDate.getUTCFullYear()
      const month = String(moscowDate.getUTCMonth() + 1).padStart(2, '0')
      const day = String(moscowDate.getUTCDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    const getMoscowWeekStart = (date: Date): string => {
      const moscowDate = toMoscowDate(date)
      const dayOfWeek = moscowDate.getUTCDay()
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const weekStart = new Date(moscowDate)
      weekStart.setUTCDate(weekStart.getUTCDate() + diff)
      const year = weekStart.getUTCFullYear()
      const month = String(weekStart.getUTCMonth() + 1).padStart(2, '0')
      const day = String(weekStart.getUTCDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    // Генерируем временные интервалы для графика (в московском времени)
    const timeIntervals: string[] = []
    const current = new Date(startDate)
    
    // Используем endDate для ограничения, а не now
    const limitDate = endDate > now ? now : endDate
    
    while (current <= limitDate) {
      if (groupFormat === 'hour') {
        timeIntervals.push(formatMoscowDate(current, 'hour'))
        current.setHours(current.getHours() + 1)
      } else if (groupFormat === 'day') {
        timeIntervals.push(formatMoscowDate(current, 'day'))
        current.setDate(current.getDate() + 1)
      } else if (groupFormat === 'week') {
        // Начало недели (понедельник) в московском времени
        timeIntervals.push(getMoscowWeekStart(current))
        current.setDate(current.getDate() + 7)
      } else if (groupFormat === 'month') {
        timeIntervals.push(formatMoscowDate(current, 'month'))
        current.setMonth(current.getMonth() + 1)
      }
    }

    // Получаем данные о пользователях за период (с пагинацией)
    const usersData = await fetchAllRows(supabase, 'profiles', 'id, created_at', [
      { field: 'created_at', op: 'gte', value: startDate.toISOString() },
      { field: 'created_at', op: 'lte', value: endDate.toISOString() }
    ])

    // Получаем общее количество пользователей для расчета конверсии
    const { count: totalUsersCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })

    // Получаем данные о генерациях (с пагинацией)
    const generationsData = await fetchAllRows(supabase, 'generations', 'created_at', [
      { field: 'created_at', op: 'gte', value: startDate.toISOString() },
      { field: 'created_at', op: 'lte', value: endDate.toISOString() }
    ])

    // Получаем данные о токенах (расход) (с пагинацией)
    const tokensData = await fetchAllRows(supabase, 'token_transactions', 'created_at, amount', [
      { field: 'transaction_type', op: 'eq', value: 'generation' },
      { field: 'created_at', op: 'gte', value: startDate.toISOString() },
      { field: 'created_at', op: 'lte', value: endDate.toISOString() }
    ])

    // Получаем данные о платежах за период (с пагинацией)
    const paymentsData = await fetchAllRows(supabase, 'payments', 'id, user_id, created_at, amount', [
      { field: 'status', op: 'eq', value: 'succeeded' },
      { field: 'created_at', op: 'gte', value: startDate.toISOString() },
      { field: 'created_at', op: 'lte', value: endDate.toISOString() }
    ])

    // Получаем ВСЕ успешные платежи для расчета повторных оплат и платящих пользователей (с пагинацией)
    const allPaymentsData = await fetchAllRows(supabase, 'payments', 'id, user_id, amount', [
      { field: 'status', op: 'eq', value: 'succeeded' }
    ])

    // Группируем данные по временным интервалам (в московском времени)
    const groupData = (data: any[], dateField: string, valueField?: string) => {
      const grouped: { [key: string]: number } = {}
      
      timeIntervals.forEach(interval => {
        grouped[interval] = 0
      })

      data?.forEach(item => {
        const itemDate = new Date(item[dateField])
        let key: string

        if (groupFormat === 'hour') {
          key = formatMoscowDate(itemDate, 'hour')
        } else if (groupFormat === 'day') {
          key = formatMoscowDate(itemDate, 'day')
        } else if (groupFormat === 'week') {
          key = getMoscowWeekStart(itemDate)
        } else if (groupFormat === 'month') {
          key = formatMoscowDate(itemDate, 'month')
        } else {
          key = formatMoscowDate(itemDate, 'day')
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

    // Генерируем временные интервалы для предыдущего периода
    const prevTimeIntervals: string[] = []
    const prevCurrent = new Date(prevStartDate)
    
    while (prevCurrent <= prevEndDate) {
      if (groupFormat === 'hour') {
        prevTimeIntervals.push(formatMoscowDate(prevCurrent, 'hour'))
        prevCurrent.setHours(prevCurrent.getHours() + 1)
      } else if (groupFormat === 'day') {
        prevTimeIntervals.push(formatMoscowDate(prevCurrent, 'day'))
        prevCurrent.setDate(prevCurrent.getDate() + 1)
      } else if (groupFormat === 'week') {
        prevTimeIntervals.push(getMoscowWeekStart(prevCurrent))
        prevCurrent.setDate(prevCurrent.getDate() + 7)
      } else if (groupFormat === 'month') {
        prevTimeIntervals.push(formatMoscowDate(prevCurrent, 'month'))
        prevCurrent.setMonth(prevCurrent.getMonth() + 1)
      }
    }

    // Функция группировки для предыдущего периода (маппим на индексы текущего периода)
    const groupDataForPrevPeriod = (data: any[], dateField: string, valueField?: string) => {
      const grouped: { [key: string]: number } = {}
      
      prevTimeIntervals.forEach(interval => {
        grouped[interval] = 0
      })

      data?.forEach(item => {
        const itemDate = new Date(item[dateField])
        let key: string

        if (groupFormat === 'hour') {
          key = formatMoscowDate(itemDate, 'hour')
        } else if (groupFormat === 'day') {
          key = formatMoscowDate(itemDate, 'day')
        } else if (groupFormat === 'week') {
          key = getMoscowWeekStart(itemDate)
        } else if (groupFormat === 'month') {
          key = formatMoscowDate(itemDate, 'month')
        } else {
          key = formatMoscowDate(itemDate, 'day')
        }

        if (grouped.hasOwnProperty(key)) {
          if (valueField) {
            grouped[key] += Math.abs(Number(item[valueField]))
          } else {
            grouped[key] += 1
          }
        }
      })

      // Возвращаем данные с индексами текущего периода для наложения графиков
      return timeIntervals.map((interval, index) => ({
        date: interval,
        value: prevTimeIntervals[index] ? grouped[prevTimeIntervals[index]] || 0 : 0
      }))
    }

    // Получаем ОБЩИЕ totals (за всё время для основных метрик, за период для отображения)
    const totalUsersInPeriod = usersData?.length || 0
    const totalGenerationsInPeriod = generationsData?.length || 0
    const totalTokensSpentInPeriod = tokensData?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0
    const totalRevenueInPeriod = paymentsData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

    // ===== ДАННЫЕ ЗА ПРЕДЫДУЩИЙ ПЕРИОД ДЛЯ СРАВНЕНИЯ =====
    const prevUsersData = await fetchAllRows(supabase, 'profiles', 'id, created_at', [
      { field: 'created_at', op: 'gte', value: prevStartDate.toISOString() },
      { field: 'created_at', op: 'lte', value: prevEndDate.toISOString() }
    ])
    
    const prevGenerationsData = await fetchAllRows(supabase, 'generations', 'created_at', [
      { field: 'created_at', op: 'gte', value: prevStartDate.toISOString() },
      { field: 'created_at', op: 'lte', value: prevEndDate.toISOString() }
    ])
    
    const prevTokensData = await fetchAllRows(supabase, 'token_transactions', 'created_at, amount', [
      { field: 'transaction_type', op: 'eq', value: 'generation' },
      { field: 'created_at', op: 'gte', value: prevStartDate.toISOString() },
      { field: 'created_at', op: 'lte', value: prevEndDate.toISOString() }
    ])
    
    const prevPaymentsData = await fetchAllRows(supabase, 'payments', 'id, user_id, created_at, amount', [
      { field: 'status', op: 'eq', value: 'succeeded' },
      { field: 'created_at', op: 'gte', value: prevStartDate.toISOString() },
      { field: 'created_at', op: 'lte', value: prevEndDate.toISOString() }
    ])

    // Totals за предыдущий период
    const prevTotalUsersInPeriod = prevUsersData?.length || 0
    const prevTotalGenerationsInPeriod = prevGenerationsData?.length || 0
    const prevTotalTokensSpentInPeriod = prevTokensData?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0
    const prevTotalRevenueInPeriod = prevPaymentsData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

    // Формируем графики для предыдущего периода
    const prevUsersChart = groupDataForPrevPeriod(prevUsersData || [], 'created_at')
    const prevGenerationsChart = groupDataForPrevPeriod(prevGenerationsData || [], 'created_at')
    const prevTokensChart = groupDataForPrevPeriod(prevTokensData || [], 'created_at', 'amount')
    const prevRevenueChart = groupDataForPrevPeriod(prevPaymentsData || [], 'created_at', 'amount')

    // Функция для расчета процента изменения
    const calculateChangePercent = (current: number, previous: number): number | null => {
      if (previous === 0) {
        return current > 0 ? 100 : null // 100% рост если было 0, или null если всё равно 0
      }
      return Math.round(((current - previous) / previous) * 1000) / 10
    }

    // Расчет процентов изменения
    const changePercents = {
      users: calculateChangePercent(totalUsersInPeriod, prevTotalUsersInPeriod),
      generations: calculateChangePercent(totalGenerationsInPeriod, prevTotalGenerationsInPeriod),
      tokens: calculateChangePercent(totalTokensSpentInPeriod, prevTotalTokensSpentInPeriod),
      revenue: calculateChangePercent(totalRevenueInPeriod, prevTotalRevenueInPeriod)
    }

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
        // Графики за предыдущий период для сравнения
        previousCharts: {
          users: prevUsersChart,
          generations: prevGenerationsChart,
          tokens: prevTokensChart,
          revenue: prevRevenueChart
        },
        totals: {
          users: totalUsersInPeriod,
          generations: totalGenerationsInPeriod,
          tokens: totalTokensSpentInPeriod,
          revenue: totalRevenueInPeriod
        },
        // Данные за предыдущий период для сравнения
        previousTotals: {
          users: prevTotalUsersInPeriod,
          generations: prevTotalGenerationsInPeriod,
          tokens: prevTotalTokensSpentInPeriod,
          revenue: prevTotalRevenueInPeriod
        },
        // Проценты изменения относительно предыдущего периода
        changePercents,
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
