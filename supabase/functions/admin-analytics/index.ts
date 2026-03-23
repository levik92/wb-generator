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
    let query = supabase.from(table).select(selectFields)
    
    if (filters) {
      for (const filter of filters) {
        if (filter.op === 'eq') {
          query = query.eq(filter.field, filter.value)
        } else if (filter.op === 'gte') {
          query = query.gte(filter.field, filter.value)
        } else if (filter.op === 'lte') {
          query = query.lte(filter.field, filter.value)
        } else if (filter.op === 'in') {
          query = query.in(filter.field, filter.value)
        }
      }
    }
    
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { period, startDateCustom, endDateCustom } = await req.json()

    const MOSCOW_OFFSET_HOURS = 3

    const now = new Date()
    let startDate: Date
    let endDate: Date = now
    let groupFormat: string

    if (startDateCustom && endDateCustom) {
      const [sy, sm, sd] = startDateCustom.split('-').map(Number)
      const [ey, em, ed] = endDateCustom.split('-').map(Number)
      startDate = new Date(Date.UTC(sy, sm - 1, sd, 0 - MOSCOW_OFFSET_HOURS, 0, 0, 0))
      endDate = new Date(Date.UTC(ey, em - 1, ed, 23 - MOSCOW_OFFSET_HOURS, 59, 59, 999))
      
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

    const periodDuration = endDate.getTime() - startDate.getTime()
    const prevEndDate = new Date(startDate.getTime() - 1)
    prevEndDate.setUTCHours(23, 59, 59, 999)
    const prevStartDate = new Date(prevEndDate.getTime() - periodDuration)
    prevStartDate.setUTCHours(0, 0, 0, 0)

    const toMoscowDate = (date: Date): Date => {
      return new Date(date.getTime() + MOSCOW_OFFSET_HOURS * 60 * 60 * 1000)
    }
    
    const formatMoscowDate = (date: Date, format: 'hour' | 'day' | 'week' | 'month'): string => {
      const moscowDate = toMoscowDate(date)
      
      if (format === 'hour') {
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

    const timeIntervals: string[] = []
    const current = new Date(startDate)
    const limitDate = endDate > now ? now : endDate
    
    while (current <= limitDate) {
      if (groupFormat === 'hour') {
        timeIntervals.push(formatMoscowDate(current, 'hour'))
        current.setHours(current.getHours() + 1)
      } else if (groupFormat === 'day') {
        timeIntervals.push(formatMoscowDate(current, 'day'))
        current.setDate(current.getDate() + 1)
      } else if (groupFormat === 'week') {
        timeIntervals.push(getMoscowWeekStart(current))
        current.setDate(current.getDate() + 7)
      } else if (groupFormat === 'month') {
        timeIntervals.push(formatMoscowDate(current, 'month'))
        current.setMonth(current.getMonth() + 1)
      }
    }

    // Получаем данные о пользователях за период
    const usersData = await fetchAllRows(supabase, 'profiles', 'id, created_at', [
      { field: 'created_at', op: 'gte', value: startDate.toISOString() },
      { field: 'created_at', op: 'lte', value: endDate.toISOString() }
    ])

    const { count: totalUsersCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })

    // === AI REQUESTS: count individual tasks, not batch operations ===
    // 1. Image generation tasks (each task = 1 image = 1 AI request)
    const imageTasksData = await fetchAllRows(supabase, 'generation_tasks', 'created_at', [
      { field: 'created_at', op: 'gte', value: startDate.toISOString() },
      { field: 'created_at', op: 'lte', value: endDate.toISOString() },
      { field: 'status', op: 'in', value: ['completed', 'processing', 'pending'] }
    ])

    // 2. Description generations (each row = 1 description = 1 AI request)
    const descriptionGenerationsData = await fetchAllRows(supabase, 'generations', 'created_at, tokens_used', [
      { field: 'generation_type', op: 'eq', value: 'description' },
      { field: 'created_at', op: 'gte', value: startDate.toISOString() },
      { field: 'created_at', op: 'lte', value: endDate.toISOString() }
    ])

    // 3. Video generation jobs (each row = 1 video = 1 AI request)
    const videoJobsData = await fetchAllRows(supabase, 'video_generation_jobs', 'created_at, tokens_cost', [
      { field: 'created_at', op: 'gte', value: startDate.toISOString() },
      { field: 'created_at', op: 'lte', value: endDate.toISOString() }
    ])

    // Combined AI requests = image tasks + descriptions + videos
    const allAiRequests = [
      ...imageTasksData.map(t => ({ created_at: t.created_at, type: 'image' })),
      ...descriptionGenerationsData.map(t => ({ created_at: t.created_at, type: 'description' })),
      ...videoJobsData.map(t => ({ created_at: t.created_at, type: 'video' })),
    ]

    // === TOKENS: use token_transactions with type 'generation' for actual user spend ===
    const tokensData = await fetchAllRows(supabase, 'token_transactions', 'created_at, amount', [
      { field: 'transaction_type', op: 'eq', value: 'generation' },
      { field: 'created_at', op: 'gte', value: startDate.toISOString() },
      { field: 'created_at', op: 'lte', value: endDate.toISOString() }
    ])

    // Image cards tokens (from generation_jobs)
    const cardTokensData = await fetchAllRows(supabase, 'generation_jobs', 'created_at, tokens_cost', [
      { field: 'created_at', op: 'gte', value: startDate.toISOString() },
      { field: 'created_at', op: 'lte', value: endDate.toISOString() }
    ])

    // Image card generations for breakdown (from generations table, type=cards)
    const generationsCardsData = await fetchAllRows(supabase, 'generations', 'created_at', [
      { field: 'generation_type', op: 'eq', value: 'cards' },
      { field: 'created_at', op: 'gte', value: startDate.toISOString() },
      { field: 'created_at', op: 'lte', value: endDate.toISOString() }
    ])

    const paymentsData = await fetchAllRows(supabase, 'payments', 'id, user_id, created_at, amount', [
      { field: 'status', op: 'eq', value: 'succeeded' },
      { field: 'created_at', op: 'gte', value: startDate.toISOString() },
      { field: 'created_at', op: 'lte', value: endDate.toISOString() }
    ])

    const allPaymentsData = await fetchAllRows(supabase, 'payments', 'id, user_id, amount, created_at', [
      { field: 'status', op: 'eq', value: 'succeeded' }
    ])

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

    // Charts
    const usersChart = groupData(usersData || [], 'created_at')
    // AI Requests chart: count individual AI requests (tasks + descriptions + videos)
    const generationsChart = groupData(allAiRequests, 'created_at')
    const tokensChart = groupData(tokensData || [], 'created_at', 'amount')
    const revenueChart = groupData(paymentsData || [], 'created_at', 'amount')

    // Previous period
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

      return timeIntervals.map((interval, index) => ({
        date: interval,
        value: prevTimeIntervals[index] ? grouped[prevTimeIntervals[index]] || 0 : 0
      }))
    }

    const totalUsersInPeriod = usersData?.length || 0
    // Total AI requests = individual image tasks + descriptions + videos
    const totalGenerationsInPeriod = allAiRequests.length
    const totalTokensSpentInPeriod = tokensData?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0
    const totalRevenueInPeriod = paymentsData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

    // Previous period data
    const prevUsersData = await fetchAllRows(supabase, 'profiles', 'id, created_at', [
      { field: 'created_at', op: 'gte', value: prevStartDate.toISOString() },
      { field: 'created_at', op: 'lte', value: prevEndDate.toISOString() }
    ])
    
    const prevImageTasksData = await fetchAllRows(supabase, 'generation_tasks', 'created_at', [
      { field: 'created_at', op: 'gte', value: prevStartDate.toISOString() },
      { field: 'created_at', op: 'lte', value: prevEndDate.toISOString() },
      { field: 'status', op: 'in', value: ['completed', 'processing', 'pending'] }
    ])

    const prevDescGenerationsData = await fetchAllRows(supabase, 'generations', 'created_at, tokens_used', [
      { field: 'generation_type', op: 'eq', value: 'description' },
      { field: 'created_at', op: 'gte', value: prevStartDate.toISOString() },
      { field: 'created_at', op: 'lte', value: prevEndDate.toISOString() }
    ])

    const prevVideoJobsData = await fetchAllRows(supabase, 'video_generation_jobs', 'created_at, tokens_cost', [
      { field: 'created_at', op: 'gte', value: prevStartDate.toISOString() },
      { field: 'created_at', op: 'lte', value: prevEndDate.toISOString() }
    ])

    const prevAllAiRequests = [
      ...prevImageTasksData.map(t => ({ created_at: t.created_at, type: 'image' })),
      ...prevDescGenerationsData.map(t => ({ created_at: t.created_at, type: 'description' })),
      ...prevVideoJobsData.map(t => ({ created_at: t.created_at, type: 'video' })),
    ]

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

    const prevTotalUsersInPeriod = prevUsersData?.length || 0
    const prevTotalGenerationsInPeriod = prevAllAiRequests.length
    const prevTotalTokensSpentInPeriod = prevTokensData?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0
    const prevTotalRevenueInPeriod = prevPaymentsData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

    // Previous period charts
    const prevUsersChart = groupDataForPrevPeriod(prevUsersData || [], 'created_at')
    const prevGenerationsChart = groupDataForPrevPeriod(prevAllAiRequests, 'created_at')
    const prevTokensChart = groupDataForPrevPeriod(prevTokensData || [], 'created_at', 'amount')
    const prevRevenueChart = groupDataForPrevPeriod(prevPaymentsData || [], 'created_at', 'amount')

    const calculateChangePercent = (current: number, previous: number): number | null => {
      if (previous === 0) {
        return current > 0 ? 100 : null
      }
      return Math.round(((current - previous) / previous) * 1000) / 10
    }

    const changePercents = {
      users: calculateChangePercent(totalUsersInPeriod, prevTotalUsersInPeriod),
      generations: calculateChangePercent(totalGenerationsInPeriod, prevTotalGenerationsInPeriod),
      tokens: calculateChangePercent(totalTokensSpentInPeriod, prevTotalTokensSpentInPeriod),
      revenue: calculateChangePercent(totalRevenueInPeriod, prevTotalRevenueInPeriod)
    }

    // Additional metrics
    const paidUsersSet = new Set<string>()
    allPaymentsData?.forEach(p => {
      if (p.user_id) paidUsersSet.add(p.user_id)
    })
    const paidUsersCount = paidUsersSet.size

    const periodPaidUsersSet = new Set<string>()
    paymentsData?.forEach(p => {
      if (p.user_id) periodPaidUsersSet.add(p.user_id)
    })
    const periodPaidUsersCount = periodPaidUsersSet.size

    const userFirstPaymentDate: { [key: string]: Date } = {}
    allPaymentsData?.forEach(p => {
      if (p.user_id && p.created_at) {
        const payDate = new Date(p.created_at)
        if (!userFirstPaymentDate[p.user_id] || payDate < userFirstPaymentDate[p.user_id]) {
          userFirstPaymentDate[p.user_id] = payDate
        }
      }
    })

    const firstTimePaidInPeriod = Object.entries(userFirstPaymentDate).filter(([_, firstDate]) => {
      return firstDate >= startDate && firstDate <= endDate
    }).length

    const totalPaymentsCount = allPaymentsData?.length || 0
    const totalPaymentsSum = allPaymentsData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
    const averageCheck = totalPaymentsCount > 0 ? Math.round(totalPaymentsSum / totalPaymentsCount) : 0

    const periodPaymentsCount = paymentsData?.length || 0
    const periodAverageCheck = periodPaymentsCount > 0 ? Math.round(totalRevenueInPeriod / periodPaymentsCount) : 0

    // Lifetime metrics
    const userPaymentDates: { [key: string]: Date[] } = {}
    allPaymentsData?.forEach(p => {
      if (p.user_id && p.created_at) {
        if (!userPaymentDates[p.user_id]) userPaymentDates[p.user_id] = []
        userPaymentDates[p.user_id].push(new Date(p.created_at))
      }
    })
    
    let totalLifetimeDays = 0
    let usersWithLifetime = 0
    Object.values(userPaymentDates).forEach(dates => {
      if (dates.length >= 1) {
        const sorted = dates.sort((a, b) => a.getTime() - b.getTime())
        const firstPayment = sorted[0]
        const lastPayment = sorted[sorted.length - 1]
        const lifetimeDays = Math.max(1, Math.ceil((lastPayment.getTime() - firstPayment.getTime()) / (1000 * 60 * 60 * 24)))
        totalLifetimeDays += lifetimeDays
        usersWithLifetime++
      }
    })
    const avgLifetimeDays = usersWithLifetime > 0 ? Math.round(totalLifetimeDays / usersWithLifetime) : 0

    const avgRevenuePerCustomer = paidUsersCount > 0 ? Math.round(totalPaymentsSum / paidUsersCount) : 0
    const avgTransactionsPerUser = paidUsersCount > 0 ? Math.round((totalPaymentsCount / paidUsersCount) * 10) / 10 : 0

    const userTotalSpent: { [key: string]: number } = {}
    allPaymentsData?.forEach(p => {
      if (p.user_id) {
        userTotalSpent[p.user_id] = (userTotalSpent[p.user_id] || 0) + Number(p.amount)
      }
    })
    const maxUserSpent = Object.values(userTotalSpent).length > 0 ? Math.round(Math.max(...Object.values(userTotalSpent))) : 0

    const periodUserPaymentCounts: { [key: string]: number } = {}
    paymentsData?.forEach(p => {
      if (p.user_id) {
        periodUserPaymentCounts[p.user_id] = (periodUserPaymentCounts[p.user_id] || 0) + 1
      }
    })
    const periodRepeatPaymentUsers = Object.values(periodUserPaymentCounts).filter(count => count > 1).length
    const periodRepeatPayments = Object.entries(periodUserPaymentCounts)
      .reduce((sum, [_, count]) => sum + (count > 1 ? count - 1 : 0), 0)

    const allTimeUserPaymentCounts: { [key: string]: number } = {}
    allPaymentsData?.forEach(p => {
      if (p.user_id) {
        allTimeUserPaymentCounts[p.user_id] = (allTimeUserPaymentCounts[p.user_id] || 0) + 1
      }
    })
    const repeatPaymentUsers = Object.values(allTimeUserPaymentCounts).filter(count => count > 1).length
    const totalRepeatPayments = Object.entries(allTimeUserPaymentCounts)
      .reduce((sum, [_, count]) => sum + (count > 1 ? count - 1 : 0), 0)

    const periodConversionRate = totalUsersInPeriod > 0 
      ? Math.round((firstTimePaidInPeriod / totalUsersInPeriod) * 1000) / 10 
      : 0

    const periodRepeatPaymentRate = periodPaidUsersCount > 0 
      ? Math.round((periodRepeatPaymentUsers / periodPaidUsersCount) * 1000) / 10 
      : 0

    // === BREAKDOWN CHARTS (for breakdown view) ===
    // For image breakdown: use generation_tasks (individual images)
    const generationsCardsChart = groupData(imageTasksData || [], 'created_at')
    const generationsDescChart = groupData(descriptionGenerationsData || [], 'created_at')
    const generationsVideoChart = groupData(videoJobsData || [], 'created_at')

    const tokensCardsChart = groupData(cardTokensData || [], 'created_at', 'tokens_cost')
    const tokensDescChart = groupData(descriptionGenerationsData || [], 'created_at', 'tokens_used')
    const tokensVideoChart = groupData(videoJobsData || [], 'created_at', 'tokens_cost')

    const totalsByType = {
      generationsCards: imageTasksData?.length || 0,
      generationsDescriptions: descriptionGenerationsData?.length || 0,
      generationsVideo: videoJobsData?.length || 0,
      tokensCards: cardTokensData?.reduce((sum, t) => sum + (t.tokens_cost || 0), 0) || 0,
      tokensDescriptions: descriptionGenerationsData?.reduce((sum, t) => sum + (t.tokens_used || 0), 0) || 0,
      tokensVideo: videoJobsData?.reduce((sum, t) => sum + (t.tokens_cost || 0), 0) || 0,
    }

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
        previousTotals: {
          users: prevTotalUsersInPeriod,
          generations: prevTotalGenerationsInPeriod,
          tokens: prevTotalTokensSpentInPeriod,
          revenue: prevTotalRevenueInPeriod
        },
        changePercents,
        generationsByType: {
          cards: generationsCardsChart,
          descriptions: generationsDescChart,
          video: generationsVideoChart,
        },
        tokensByType: {
          cards: tokensCardsChart,
          descriptions: tokensDescChart,
          video: tokensVideoChart,
        },
        totalsByType,
        additionalMetrics: {
          paidUsers: periodPaidUsersCount,
          paidUsersTotal: paidUsersCount,
          averageCheck: periodAverageCheck,
          averageCheckTotal: averageCheck,
          repeatPayments: periodRepeatPayments,
          repeatPaymentsTotal: totalRepeatPayments,
          repeatPaymentUsers: repeatPaymentUsers,
          periodRepeatPaymentUsers: periodRepeatPaymentUsers,
          periodUsersTotal: totalUsersInPeriod,
          totalUsers: totalUsersCount || 0,
          firstTimePaidInPeriod: firstTimePaidInPeriod,
          conversionRate: periodConversionRate,
          conversionRateTotal: (totalUsersCount && totalUsersCount > 0) 
            ? Math.round((paidUsersCount / totalUsersCount) * 1000) / 10 
            : 0,
          repeatPaymentRate: periodRepeatPaymentRate,
          repeatPaymentRateTotal: paidUsersCount > 0 
            ? Math.round((repeatPaymentUsers / paidUsersCount) * 1000) / 10 
            : 0
        },
        lifetimeMetrics: {
          avgLifetimeDays,
          avgRevenuePerCustomer,
          avgTransactionsPerUser,
          maxUserSpent,
          totalPaidUsers: paidUsersCount,
          totalPaymentsSum: Math.round(totalPaymentsSum),
          totalPaymentsCount
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
