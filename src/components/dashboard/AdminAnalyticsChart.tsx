import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { Users, Activity, Coins, DollarSign, TrendingUp, TrendingDown, Minus, CreditCard, Repeat, Calculator, CalendarIcon, ExternalLink, PieChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { PaidUsersDetailDialog } from "@/components/admin/PaidUsersDetailDialog";

interface ChartData {
  date: string;
  value: number;
}

interface AdditionalMetrics {
  paidUsers: number;
  paidUsersTotal: number;
  averageCheck: number;
  averageCheckTotal: number;
  repeatPayments: number;
  repeatPaymentsTotal: number;
  repeatPaymentUsers: number;
  periodRepeatPaymentUsers: number;
  periodUsersTotal: number;
  totalUsers: number;
  firstTimePaidInPeriod: number;
  conversionRate: number;
  conversionRateTotal: number;
  repeatPaymentRate: number;
  repeatPaymentRateTotal: number;
}

interface LifetimeMetrics {
  avgLifetimeDays: number;
  avgRevenuePerCustomer: number;
  avgTransactionsPerUser: number;
  maxUserSpent: number;
  totalPaidUsers: number;
  totalPaymentsSum: number;
  totalPaymentsCount: number;
}

interface AnalyticsData {
  period: string;
  groupFormat: string;
  charts: {
    users: ChartData[];
    generations: ChartData[];
    tokens: ChartData[];
    revenue: ChartData[];
  };
  previousCharts?: {
    users: ChartData[];
    generations: ChartData[];
    tokens: ChartData[];
    revenue: ChartData[];
  };
  totals: {
    users: number;
    generations: number;
    tokens: number;
    revenue: number;
  };
  previousTotals?: {
    users: number;
    generations: number;
    tokens: number;
    revenue: number;
  };
  changePercents?: {
    users: number | null;
    generations: number | null;
    tokens: number | null;
    revenue: number | null;
  };
  additionalMetrics?: AdditionalMetrics;
}

interface AdminAnalyticsChartProps {
  type: 'users' | 'generations' | 'tokens' | 'revenue';
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange | undefined) => void;
}

const chartConfig = {
  users: {
    title: 'Новые пользователи',
    icon: Users,
    color: '#8b5cf6',
    prevColor: '#8b5cf6',
    gradient: 'url(#purpleGradient)',
    prevGradient: 'url(#purplePrevGradient)',
    formatValue: (value: number) => value.toLocaleString('ru-RU'),
    formatTooltip: (value: number) => `${value} пользователей`
  },
  generations: {
    title: 'Запросы к AI',
    icon: Activity,
    color: '#a855f7',
    prevColor: '#a855f7',
    gradient: 'url(#violetGradient)',
    prevGradient: 'url(#violetPrevGradient)',
    formatValue: (value: number) => value.toLocaleString('ru-RU'),
    formatTooltip: (value: number) => `${value} запросов`
  },
  tokens: {
    title: 'Потрачено токенов',
    icon: Coins,
    color: '#9333ea',
    prevColor: '#9333ea',
    gradient: 'url(#purpleTokenGradient)',
    prevGradient: 'url(#purpleTokenPrevGradient)',
    formatValue: (value: number) => value.toLocaleString('ru-RU'),
    formatTooltip: (value: number) => `${value} токенов`
  },
  revenue: {
    title: 'Доход',
    icon: DollarSign,
    color: '#7c3aed',
    prevColor: '#7c3aed',
    gradient: 'url(#purpleRevenueGradient)',
    prevGradient: 'url(#purpleRevenuePrevGradient)',
    formatValue: (value: number) => `${value.toLocaleString('ru-RU')}₽`,
    formatTooltip: (value: number) => `${value.toLocaleString('ru-RU')}₽`
  }
};

export function AdminAnalyticsChart({
  type,
  dateRange,
  onDateRangeChange
}: AdminAnalyticsChartProps) {
  const [internalDateRange, setInternalDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { from: weekAgo, to: now };
  });
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(undefined);
  const config = chartConfig[type];
  const Icon = config.icon;

  // Use external dateRange if provided, otherwise use internal
  const effectiveDateRange = dateRange ?? internalDateRange;
  const setEffectiveDateRange = onDateRangeChange ?? setInternalDateRange;

  // Обработчик выбора даты: первый клик — начало, второй — конец
  const handleCalendarSelect = (range: DateRange | undefined) => {
    if (!range || !range.from) {
      setPendingRange(undefined);
      setIsSelectingRange(false);
      return;
    }

    if (range.from && range.to && range.from.getTime() !== range.to.getTime()) {
      // Полный диапазон выбран — нормализуем порядок
      const finalFrom = range.from <= range.to ? range.from : range.to;
      const finalTo = range.from <= range.to ? range.to : range.from;
      setPendingRange(undefined);
      setIsSelectingRange(false);
      setEffectiveDateRange({ from: finalFrom, to: finalTo });
    } else {
      // Только начало — ждём второго клика
      setPendingRange({ from: range.from, to: undefined });
      setIsSelectingRange(true);
    }
  };

  // Отображаемый диапазон в календаре (либо pending, либо effective)
  const displayedRange = isSelectingRange ? pendingRange : effectiveDateRange;

  useEffect(() => {
    // Загружаем данные только когда выбран полный диапазон и мы не в процессе выбора
    if (!isSelectingRange && effectiveDateRange?.from && effectiveDateRange?.to) {
      loadAnalytics();
    }
  }, [effectiveDateRange?.from?.getTime(), effectiveDateRange?.to?.getTime(), isSelectingRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const body: any = { period: 'custom' };
      
      if (effectiveDateRange?.from && effectiveDateRange?.to) {
        const formatLocalDate = (d: Date) => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        body.startDateCustom = formatLocalDate(effectiveDateRange.from);
        body.endDateCustom = formatLocalDate(effectiveDateRange.to);
      }
      
      const {
        data: result,
        error
      } = await supabase.functions.invoke('admin-analytics', {
        body
      });
      if (error) throw error;
      setData(result);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить аналитику",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDateRange = () => {
    if (!effectiveDateRange?.from) return "Выбрать даты";
    if (!effectiveDateRange?.to) return format(effectiveDateRange.from, "dd.MM.yy", { locale: ru });
    return `${format(effectiveDateRange.from, "dd.MM.yy", { locale: ru })} - ${format(effectiveDateRange.to, "dd.MM.yy", { locale: ru })}`;
  };

  const formatXAxisDate = (dateStr: string, groupFormat: string) => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { timeZone: 'Europe/Moscow' };
    
    switch (groupFormat) {
      case 'hour':
        return date.toLocaleTimeString('ru-RU', {
          ...options,
          hour: '2-digit',
          minute: '2-digit'
        });
      case 'day':
        return date.toLocaleDateString('ru-RU', {
          ...options,
          day: '2-digit',
          month: '2-digit'
        });
      case 'week':
        return date.toLocaleDateString('ru-RU', {
          ...options,
          day: '2-digit',
          month: '2-digit'
        });
      case 'month':
        return date.toLocaleDateString('ru-RU', {
          ...options,
          month: 'short',
          year: '2-digit'
        });
      default:
        return date.toLocaleDateString('ru-RU', {
          ...options,
          day: '2-digit',
          month: '2-digit'
        });
    }
  };

  const getTrendFromApi = () => {
    // Используем данные сравнения с предыдущим периодом от API
    if (!data?.changePercents) {
      return { trend: 'neutral' as const, percentage: 0 };
    }
    
    const changePercent = data.changePercents[type];
    
    if (changePercent === null) {
      return { trend: 'neutral' as const, percentage: 0 };
    }
    
    if (Math.abs(changePercent) < 1) {
      return { trend: 'neutral' as const, percentage: 0 };
    }
    
    return {
      trend: changePercent > 0 ? 'up' as const : 'down' as const,
      percentage: Math.abs(changePercent)
    };
  };
  
  const trend = getTrendFromApi();

  // Объединяем данные текущего и предыдущего периода для графика
  const combinedChartData = data?.charts[type]?.map((item, index) => ({
    date: item.date,
    value: item.value,
    prevValue: data?.previousCharts?.[type]?.[index]?.value ?? 0
  })) || [];

  const CustomTooltip = ({
    active,
    payload,
    label
  }: any) => {
    if (active && payload && payload.length) {
      // Находим значения по dataKey для корректного отображения
      const currentEntry = payload.find((p: any) => p.dataKey === 'value');
      const prevEntry = payload.find((p: any) => p.dataKey === 'prevValue');
      
      const currentValue = typeof currentEntry?.value === 'number' ? currentEntry.value : 0;
      const prevValue = typeof prevEntry?.value === 'number' ? prevEntry.value : 0;
      
      return (
        <div className="bg-popover/95 backdrop-blur-sm border border-border/60 rounded-xl px-3 py-2.5 shadow-xl">
          <p className="text-[11px] font-medium text-muted-foreground mb-1.5">
            {formatXAxisDate(label, data?.groupFormat || 'day')}
          </p>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
            <span className="text-muted-foreground">Текущий:</span>
            <span className="font-semibold tabular-nums text-foreground">{config.formatTooltip(currentValue)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm mt-0.5">
            <span className="w-2 h-2 rounded-full opacity-40" style={{ backgroundColor: config.color }} />
            <span className="text-muted-foreground">Прошлый:</span>
            <span className="font-medium tabular-nums text-muted-foreground">{config.formatTooltip(prevValue)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <Card className="animate-fade-in rounded-2xl border-border/60 bg-card overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-5">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${config.color}1a`, color: config.color }}>
              <Icon className="h-4 w-4" />
            </span>
            {config.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-0">
          <div className="flex items-center justify-center h-[180px] sm:h-[220px]">
            <div className="w-7 h-7 rounded-full border-[2.5px] border-primary/30 border-t-primary animate-[spin_0.7s_linear_infinite]" />
          </div>
        </CardContent>
      </Card>;
  }

  return <Card className="animate-fade-in rounded-2xl border-border/60 bg-card overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 gap-2 p-4 sm:px-5 sm:pt-5 sm:pb-0">

        <div className="flex items-center gap-2.5 min-w-0">
          <span className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${config.color}1a`, color: config.color }}>
            <Icon className="h-4 w-4" />
          </span>
          <CardTitle className="text-sm font-semibold truncate">{config.title}</CardTitle>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 px-2.5 text-[11px] gap-1 rounded-full bg-muted/40 hover:bg-violet-500/10 hover:text-violet-500 hover:border-violet-500/40 border-border/60 shrink-0 transition-colors"
            >
              <CalendarIcon className="h-3 w-3" />
              <span className="hidden sm:inline">{formatDateRange()}</span>
              <span className="sm:hidden">Период</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 rounded-xl border-border/60 shadow-xl overflow-hidden" align="end">
            <div className="px-3 pt-2 pb-1 border-b border-border/40 bg-muted/30 w-full">
              <div className="text-[10px] leading-tight font-medium text-muted-foreground text-center">

                {isSelectingRange && pendingRange?.from
                  ? <>Начало: <span className="text-foreground font-semibold tabular-nums">{format(pendingRange.from, "dd.MM.yy", { locale: ru })}</span> · выберите конец</>
                  : "Выберите начало, затем — конец периода"}
              </div>
            </div>
            <Calendar
              mode="range"
              selected={displayedRange}
              onSelect={handleCalendarSelect}
              defaultMonth={displayedRange?.from || effectiveDateRange?.from}
              numberOfMonths={1}
              locale={ru}
              disabled={(date) => date > new Date()}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </CardHeader>
      
      <CardContent className="p-4 sm:p-5 pt-0">
        <div className="space-y-3 sm:space-y-4">
          {/* Total Value */}
          <div className="flex items-end justify-between gap-2 flex-wrap">
            <div className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight">
              {data ? config.formatValue(data.totals[type]) : '---'}
            </div>
            {trend.trend !== 'neutral' && <Badge variant="outline" className={`gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${trend.trend === 'up' ? 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10 dark:text-emerald-400' : 'text-red-600 border-red-500/30 bg-red-500/10 dark:text-red-400'}`}>
                {trend.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trend.percentage.toFixed(1)}%
              </Badge>}
          </div>

          {/* Chart */}
          <div className="h-[180px] sm:h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={combinedChartData} margin={{ top: 4, right: 4, left: -4, bottom: 0 }}>
                <defs>
                  <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="purplePrevGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.08} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="violetGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="violetPrevGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.08} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="purpleTokenGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9333ea" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="purpleTokenPrevGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9333ea" stopOpacity={0.08} />
                    <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="purpleRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="purpleRevenuePrevGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.08} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{
                fontSize: 11, fill: 'hsl(var(--muted-foreground))'
              }} tickFormatter={value => formatXAxisDate(value, data?.groupFormat || 'day')} interval="preserveStartEnd" minTickGap={24} />
                <YAxis axisLine={false} tickLine={false} tick={{
                fontSize: 11, fill: 'hsl(var(--muted-foreground))'
              }} tickFormatter={value => value >= 1000 ? `${(value/1000).toFixed(value >= 10000 ? 0 : 1)}k` : value.toLocaleString('ru-RU')} width={52} tickMargin={6} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: config.color, strokeOpacity: 0.25, strokeWidth: 1 }} />
                {/* Линия предыдущего периода */}
                <Area 
                  type="monotone" 
                  dataKey="prevValue" 
                  stroke={config.prevColor} 
                  strokeOpacity={0.35}
                  strokeDasharray="4 4"
                  fillOpacity={1} 
                  fill={config.prevGradient} 
                  strokeWidth={1.5} 
                  animationDuration={1500} 
                  animationEasing="ease-out" 
                />
                {/* Линия текущего периода */}
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={config.color} 
                  fillOpacity={1} 
                  fill={config.gradient} 
                  strokeWidth={2.25} 
                  animationDuration={1500} 
                  animationEasing="ease-out" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Period Description */}
          <p className="text-[11px] text-muted-foreground text-center tabular-nums">
            {formatDateRange()}
          </p>
        </div>
      </CardContent>
    </Card>;
}

// Компонент для дополнительных метрик
export function AdminAdditionalMetrics() {
  const [metrics, setMetrics] = useState<AdditionalMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { from: weekAgo, to: now };
  });
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(undefined);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    // Загружаем данные только когда выбран полный диапазон и мы не в процессе выбора
    if (!isSelectingRange && dateRange?.from && dateRange?.to) {
      loadMetrics();
    }
  }, [dateRange?.from?.getTime(), dateRange?.to?.getTime(), isSelectingRange]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const body: any = { period: 'custom' };
      
      if (dateRange?.from && dateRange?.to) {
        const formatLocalDate = (d: Date) => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        body.startDateCustom = formatLocalDate(dateRange.from);
        body.endDateCustom = formatLocalDate(dateRange.to);
      }
      
      const { data: result, error } = await supabase.functions.invoke('admin-analytics', {
        body
      });
      if (error) throw error;
      setMetrics(result?.additionalMetrics || null);
    } catch (error) {
      console.error('Error loading additional metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Обработчик выбора даты в календаре
  const handleCalendarSelect = (range: DateRange | undefined) => {
    if (!range) {
      setPendingRange(undefined);
      setIsSelectingRange(false);
      return;
    }

    // Если выбрана только начальная дата (from есть, to нет или from === to)
    if (range.from && (!range.to || range.from.getTime() === range.to.getTime())) {
      // Первый клик - начинаем выбор диапазона
      setPendingRange(range);
      setIsSelectingRange(true);
    } else if (range.from && range.to && range.from.getTime() !== range.to.getTime()) {
      // Второй клик - диапазон полностью выбран
      setPendingRange(undefined);
      setIsSelectingRange(false);
      setDateRange(range);
    }
  };

  // Отображаемый диапазон в календаре
  const displayedRange = isSelectingRange ? pendingRange : dateRange;

  const formatDateRange = () => {
    if (!dateRange?.from) return "Выбрать даты";
    if (!dateRange?.to) return format(dateRange.from, "dd.MM.yy", { locale: ru });
    return `${format(dateRange.from, "dd.MM.yy", { locale: ru })} - ${format(dateRange.to, "dd.MM.yy", { locale: ru })}`;
  };

  if (loading) {
    return (
      <Card className="animate-fade-in rounded-2xl border-border/60 bg-card overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 p-4 sm:px-5 sm:pt-5 sm:pb-4 bg-gradient-to-br from-violet-500/[0.04] via-transparent to-transparent border-b border-border/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm shadow-violet-500/25 shrink-0">
              <Calculator className="h-4 w-4 text-white" />
            </span>
            <CardTitle className="text-sm font-semibold truncate">Дополнительные метрики</CardTitle>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-[11px] gap-1 rounded-full bg-muted/40 hover:bg-violet-500/10 hover:text-violet-500 hover:border-violet-500/40 border-border/60 shrink-0 transition-colors"
              >
                <CalendarIcon className="h-3 w-3" />
                <span className="hidden sm:inline">{formatDateRange()}</span>
                <span className="sm:hidden">Период</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-xl border-border/60 shadow-xl overflow-hidden" align="end">
              <div className="px-3 pt-2 pb-1 border-b border-border/40 bg-muted/30 w-full">
                <div className="text-[10px] leading-tight font-medium text-muted-foreground text-center">
                  Выберите начало, затем — конец периода
                </div>
              </div>
              <Calendar
                mode="range"
                selected={displayedRange}
                onSelect={handleCalendarSelect}
                defaultMonth={displayedRange?.from || dateRange?.from}
                numberOfMonths={1}
                locale={ru}
                disabled={(date) => date > new Date()}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 rounded-xl bg-muted/40 border border-border/60 min-h-[110px]">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-8 w-16 bg-muted rounded" />
                  <div className="h-3 w-20 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="animate-fade-in rounded-2xl border-border/60 bg-card overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 p-4 sm:px-5 sm:pt-5 sm:pb-4 bg-gradient-to-br from-violet-500/[0.04] via-transparent to-transparent border-b border-border/50">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm shadow-violet-500/25 shrink-0">
            <Calculator className="h-4 w-4 text-white" />
          </span>
          <CardTitle className="text-sm font-semibold truncate">Дополнительные метрики</CardTitle>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-[11px] gap-1 rounded-full bg-muted/40 hover:bg-violet-500/10 hover:text-violet-500 hover:border-violet-500/40 border-border/60 shrink-0 transition-colors"
            >
              <CalendarIcon className="h-3 w-3" />
              <span className="hidden sm:inline">{formatDateRange()}</span>
              <span className="sm:hidden">Период</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 rounded-xl border-border/60 shadow-xl overflow-hidden" align="end">
            <div className="px-3 pt-2 pb-1 border-b border-border/40 bg-muted/30 w-full">
              <div className="text-[10px] leading-tight font-medium text-muted-foreground text-center">
                Выберите начало, затем — конец периода
              </div>
            </div>
            <Calendar
              mode="range"
              selected={displayedRange}
              onSelect={handleCalendarSelect}
              defaultMonth={displayedRange?.from || dateRange?.from}
              numberOfMonths={1}
              locale={ru}
              disabled={(date) => date > new Date()}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Платные пользователи */}
          <div className="group relative p-4 pr-14 rounded-xl bg-muted/40 border border-border/60 min-h-[110px] flex flex-col transition-colors hover:border-violet-500/30 hover:bg-muted/60">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-7 w-7 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <CreditCard className="h-3.5 w-3.5 text-green-500" />
              </span>
              <span className="text-xs font-medium text-muted-foreground truncate">Платные пользователи</span>
            </div>
            <div className="text-2xl font-bold tabular-nums tracking-tight text-green-600 dark:text-green-400">
              {metrics?.paidUsers?.toLocaleString('ru-RU') || 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Всего: <span className="tabular-nums font-medium text-foreground/80">{metrics?.paidUsersTotal?.toLocaleString('ru-RU') || 0}</span>
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg bg-violet-500/10 hover:bg-gradient-to-br hover:from-violet-500 hover:to-purple-600 text-violet-600 dark:text-violet-400 hover:text-white shadow-sm hover:shadow-violet-500/25 transition-all"
              onClick={() => setDetailOpen(true)}
              title="Подробнее: новые и повторные"
            >
              <PieChart className="h-4 w-4" />
            </Button>
          </div>

          {/* Средний чек */}
          <div className="p-4 rounded-xl bg-muted/40 border border-border/60 min-h-[110px] transition-colors hover:border-violet-500/30 hover:bg-muted/60">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <DollarSign className="h-3.5 w-3.5 text-blue-500" />
              </span>
              <span className="text-xs font-medium text-muted-foreground truncate">Средний чек</span>
            </div>
            <div className="text-2xl font-bold tabular-nums tracking-tight text-blue-600 dark:text-blue-400">
              {metrics?.averageCheck?.toLocaleString('ru-RU') || 0}₽
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Общий: <span className="tabular-nums font-medium text-foreground/80">{metrics?.averageCheckTotal?.toLocaleString('ru-RU') || 0}₽</span>
            </p>
          </div>

          {/* Повторные оплаты */}
          <div className="p-4 rounded-xl bg-muted/40 border border-border/60 min-h-[110px] transition-colors hover:border-violet-500/30 hover:bg-muted/60">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-7 w-7 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                <Repeat className="h-3.5 w-3.5 text-purple-500" />
              </span>
              <span className="text-xs font-medium text-muted-foreground truncate">Повторные оплаты</span>
            </div>
            <div className="text-2xl font-bold tabular-nums tracking-tight text-purple-600 dark:text-purple-400">
              {metrics?.repeatPaymentRate || 0}%
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              <span className="tabular-nums font-medium text-foreground/80">{metrics?.periodRepeatPaymentUsers || 0}</span> из <span className="tabular-nums font-medium text-foreground/80">{metrics?.paidUsers || 0}</span> польз.
              <span className="text-muted-foreground/70"> (всего: {metrics?.repeatPaymentRateTotal || 0}%)</span>
            </p>
          </div>

          {/* Конверсия в оплату */}
          <div className="p-4 rounded-xl bg-muted/40 border border-border/60 min-h-[110px] transition-colors hover:border-violet-500/30 hover:bg-muted/60">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-7 w-7 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                <TrendingUp className="h-3.5 w-3.5 text-orange-500" />
              </span>
              <span className="text-xs font-medium text-muted-foreground truncate">Конверсия в оплату</span>
            </div>
            <div className="text-2xl font-bold tabular-nums tracking-tight text-orange-600 dark:text-orange-400">
              {metrics?.conversionRate || 0}%
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              <span className="tabular-nums font-medium text-foreground/80">{metrics?.firstTimePaidInPeriod || 0}</span> перв. оплат из <span className="tabular-nums font-medium text-foreground/80">{metrics?.periodUsersTotal || 0}</span> рег.
              <span className="text-muted-foreground/70"> (всего: {metrics?.conversionRateTotal || 0}%)</span>
            </p>
          </div>
        </div>
      </CardContent>
      <PaidUsersDetailDialog open={detailOpen} onOpenChange={setDetailOpen} dateRange={dateRange} />
    </Card>
  );
}


// Компонент для метрик за всё время (LTV, средняя прибыль и т.д.)
export function AdminLifetimeMetrics() {
  const [metrics, setMetrics] = useState<LifetimeMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      const formatLocalDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      const { data: result, error } = await supabase.functions.invoke('admin-analytics', {
        body: { period: 'custom', startDateCustom: formatLocalDate(yearAgo), endDateCustom: formatLocalDate(now) }
      });
      if (error) throw error;
      setMetrics(result?.lifetimeMetrics || null);
    } catch (error) {
      console.error('Error loading lifetime metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="animate-fade-in">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Метрики за всё время
          </CardTitle>
          <CardDescription>Ключевые показатели платящих пользователей</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 md:p-4 rounded-lg bg-muted/50 border border-border/50 min-h-[90px]">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 w-20 bg-muted rounded" />
                  <div className="h-7 w-14 bg-muted rounded" />
                  <div className="h-3 w-16 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in rounded-2xl border-border/60 bg-card shadow-sm overflow-hidden">
      <CardHeader className="pb-4 bg-gradient-to-br from-violet-500/[0.06] via-transparent to-transparent border-b border-border/50">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm shadow-violet-500/25 shrink-0">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm sm:text-base">Метрики за всё время</CardTitle>
            <CardDescription className="text-xs mt-0.5">Ключевые показатели платящих пользователей</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {[
            {
              icon: Coins,
              label: 'LTV (дней)',
              value: metrics?.avgLifetimeDays?.toLocaleString('ru-RU') || 0,
              caption: 'Ср. время жизни платного юзера',
              tint: 'emerald',
            },
            {
              icon: DollarSign,
              label: 'Ср. прибыль',
              value: `${metrics?.avgRevenuePerCustomer?.toLocaleString('ru-RU') || 0}₽`,
              caption: `На ${metrics?.totalPaidUsers || 0} платящих`,
              tint: 'blue',
            },
            {
              icon: Repeat,
              label: 'Ср. транзакций',
              value: metrics?.avgTransactionsPerUser || 0,
              caption: `Всего: ${metrics?.totalPaymentsCount?.toLocaleString('ru-RU') || 0} оплат`,
              tint: 'violet',
            },
            {
              icon: TrendingUp,
              label: 'Макс. от юзера',
              value: `${metrics?.maxUserSpent?.toLocaleString('ru-RU') || 0}₽`,
              caption: 'Совокупная сумма оплат',
              tint: 'amber',
            },
          ].map(({ icon: Icon, label, value, caption, tint }) => {
            const tintMap: Record<string, { bg: string; icon: string; text: string; ring: string }> = {
              emerald: { bg: 'bg-emerald-500/10', icon: 'text-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', ring: 'hover:border-emerald-500/30' },
              blue: { bg: 'bg-blue-500/10', icon: 'text-blue-500', text: 'text-blue-600 dark:text-blue-400', ring: 'hover:border-blue-500/30' },
              violet: { bg: 'bg-violet-500/10', icon: 'text-violet-500', text: 'text-violet-600 dark:text-violet-400', ring: 'hover:border-violet-500/30' },
              amber: { bg: 'bg-amber-500/10', icon: 'text-amber-500', text: 'text-amber-600 dark:text-amber-400', ring: 'hover:border-amber-500/30' },
            };
            const c = tintMap[tint];
            return (
              <div
                key={label}
                className={`group relative p-3 sm:p-4 rounded-xl bg-card border border-border/60 ${c.ring} shadow-sm hover:shadow-md transition-all`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`h-6 w-6 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-3.5 w-3.5 ${c.icon}`} />
                  </div>
                  <span className="text-[11px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wide truncate">
                    {label}
                  </span>
                </div>
                <div className={`text-lg sm:text-2xl font-bold tabular-nums ${c.text} leading-tight`}>
                  {value}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 leading-snug">
                  {caption}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
