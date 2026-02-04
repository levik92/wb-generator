import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { Users, Activity, Coins, DollarSign, TrendingUp, TrendingDown, Minus, CreditCard, Repeat, Calculator, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

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
  conversionRate: number;
  conversionRateTotal: number;
  repeatPaymentRate: number;
  repeatPaymentRateTotal: number;
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
  const config = chartConfig[type];
  const Icon = config.icon;

  // Use external dateRange if provided, otherwise use internal
  const effectiveDateRange = dateRange ?? internalDateRange;
  const handleDateRangeChange = onDateRangeChange ?? setInternalDateRange;

  useEffect(() => {
    loadAnalytics();
  }, [effectiveDateRange?.from, effectiveDateRange?.to]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const body: any = { period: 'custom' };
      
      if (effectiveDateRange?.from && effectiveDateRange?.to) {
        body.startDateCustom = effectiveDateRange.from.toISOString();
        body.endDateCustom = effectiveDateRange.to.toISOString();
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
        <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground mb-1">
            {formatXAxisDate(label, data?.groupFormat || 'day')}
          </p>
          <p className="text-sm text-foreground">
            <span className="font-medium">Текущий:</span> {config.formatTooltip(currentValue)}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Прошлый:</span> {config.formatTooltip(prevValue)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <Card className="animate-fade-in bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {config.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>;
  }

  return <Card className="animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">{config.title}</CardTitle>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-6 px-2 text-xs gap-1"
            >
              <CalendarIcon className="h-3 w-3" />
              {formatDateRange()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={effectiveDateRange}
              onSelect={handleDateRangeChange}
              numberOfMonths={1}
              locale={ru}
              disabled={(date) => date > new Date()}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Total Value */}
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">
              {data ? config.formatValue(data.totals[type]) : '---'}
            </div>
            {trend.trend !== 'neutral' && <Badge variant="outline" className={`gap-1 ${trend.trend === 'up' ? 'text-green-600 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800' : 'text-red-600 border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800'}`}>
                {trend.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trend.percentage.toFixed(1)}%
              </Badge>}
          </div>

          {/* Chart */}
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={combinedChartData}>
                <defs>
                  <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="purplePrevGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.08} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="violetGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="violetPrevGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.08} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="purpleTokenGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="purpleTokenPrevGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9333ea" stopOpacity={0.08} />
                    <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="purpleRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="purpleRevenuePrevGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.08} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{
                fontSize: 12
              }} tickFormatter={value => formatXAxisDate(value, data?.groupFormat || 'day')} interval="preserveStartEnd" />
                <YAxis axisLine={false} tickLine={false} tick={{
                fontSize: 12
              }} tickFormatter={value => value.toLocaleString('ru-RU')} />
                <Tooltip content={<CustomTooltip />} />
                {/* Линия предыдущего периода - полупрозрачная, на заднем плане */}
                <Area 
                  type="monotone" 
                  dataKey="prevValue" 
                  stroke={config.prevColor} 
                  strokeOpacity={0.3}
                  strokeDasharray="4 4"
                  fillOpacity={1} 
                  fill={config.prevGradient} 
                  strokeWidth={1.5} 
                  animationDuration={1500} 
                  animationEasing="ease-out" 
                />
                {/* Линия текущего периода - основная */}
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={config.color} 
                  fillOpacity={1} 
                  fill={config.gradient} 
                  strokeWidth={2} 
                  animationDuration={1500} 
                  animationEasing="ease-out" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Period Description */}
          <p className="text-xs text-muted-foreground text-center">
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

  useEffect(() => {
    loadMetrics();
  }, [dateRange]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const body: any = { period: 'custom' };
      
      if (dateRange?.from && dateRange?.to) {
        body.startDateCustom = dateRange.from.toISOString();
        body.endDateCustom = dateRange.to.toISOString();
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

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
  };

  const formatDateRange = () => {
    if (!dateRange?.from) return "Выбрать даты";
    if (!dateRange?.to) return format(dateRange.from, "dd.MM.yy", { locale: ru });
    return `${format(dateRange.from, "dd.MM.yy", { locale: ru })} - ${format(dateRange.to, "dd.MM.yy", { locale: ru })}`;
  };

  if (loading) {
    return (
      <Card className="animate-fade-in">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4 text-muted-foreground" />
            Дополнительные метрики
          </CardTitle>
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-6 px-2 text-xs gap-1"
              >
                <CalendarIcon className="h-3 w-3" />
                {formatDateRange()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={handleDateRangeSelect}
                numberOfMonths={1}
                locale={ru}
                disabled={(date) => date > new Date()}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 rounded-lg bg-muted/50 border border-border/50 min-h-[100px]">
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
    <Card className="animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-4 w-4 text-muted-foreground" />
          Дополнительные метрики
        </CardTitle>
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-6 px-2 text-xs gap-1"
            >
              <CalendarIcon className="h-3 w-3" />
              {formatDateRange()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={handleDateRangeSelect}
              numberOfMonths={1}
              locale={ru}
              disabled={(date) => date > new Date()}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Платные пользователи */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border/50 min-h-[100px]">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Платные пользователи</span>
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {metrics?.paidUsers?.toLocaleString('ru-RU') || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Всего: {metrics?.paidUsersTotal?.toLocaleString('ru-RU') || 0}
            </p>
          </div>

          {/* Средний чек */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border/50 min-h-[100px]">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Средний чек</span>
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {metrics?.averageCheck?.toLocaleString('ru-RU') || 0}₽
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Общий: {metrics?.averageCheckTotal?.toLocaleString('ru-RU') || 0}₽
            </p>
          </div>

          {/* Повторные оплаты */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border/50 min-h-[100px]">
            <div className="flex items-center gap-2 mb-2">
              <Repeat className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Повторные оплаты</span>
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {metrics?.repeatPaymentRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.periodRepeatPaymentUsers || 0} из {metrics?.paidUsers || 0} польз.
              <span className="text-muted-foreground/70"> (всего: {metrics?.repeatPaymentRateTotal || 0}%)</span>
            </p>
          </div>

          {/* Конверсия в оплату */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border/50 min-h-[100px]">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Конверсия в оплату</span>
            </div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {metrics?.conversionRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.paidUsers || 0} из {metrics?.periodUsersTotal || 0} польз.
              <span className="text-muted-foreground/70"> (всего: {metrics?.conversionRateTotal || 0}%)</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
