import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";
import { 
  Users, 
  Activity, 
  Coins, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ChartData {
  date: string;
  value: number;
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
  totals: {
    users: number;
    generations: number;
    tokens: number;
    revenue: number;
  };
}

interface AdminAnalyticsChartProps {
  type: 'users' | 'generations' | 'tokens' | 'revenue';
}

const periods = [
  { key: 'day', label: 'День', shortLabel: '24ч' },
  { key: 'week', label: 'Неделя', shortLabel: '7д' },
  { key: 'month', label: 'Месяц', shortLabel: '30д' },
  { key: '3months', label: '3 месяца', shortLabel: '3м' },
  { key: 'year', label: 'Год', shortLabel: '1г' }
];

const chartConfig = {
  users: {
    title: 'Пользователи',
    icon: Users,
    color: '#8b5cf6',
    gradient: 'url(#purpleGradient)',
    formatValue: (value: number) => value.toLocaleString('ru-RU'),
    formatTooltip: (value: number) => `${value} пользователей`
  },
  generations: {
    title: 'Генерации',
    icon: Activity,
    color: '#a855f7',
    gradient: 'url(#violetGradient)',
    formatValue: (value: number) => value.toLocaleString('ru-RU'),
    formatTooltip: (value: number) => `${value} генераций`
  },
  tokens: {
    title: 'Потрачено токенов',
    icon: Coins,
    color: '#9333ea',
    gradient: 'url(#purpleTokenGradient)',
    formatValue: (value: number) => value.toLocaleString('ru-RU'),
    formatTooltip: (value: number) => `${value} токенов`
  },
  revenue: {
    title: 'Доход',
    icon: DollarSign,
    color: '#7c3aed',
    gradient: 'url(#purpleRevenueGradient)',
    formatValue: (value: number) => `${value.toLocaleString('ru-RU')}₽`,
    formatTooltip: (value: number) => `${value.toLocaleString('ru-RU')}₽`
  }
};

export function AdminAnalyticsChart({ type }: AdminAnalyticsChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const config = chartConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('admin-analytics', {
        body: { period: selectedPeriod }
      });

      if (error) throw error;
      setData(result);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить аналитику",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatXAxisDate = (dateStr: string, groupFormat: string) => {
    const date = new Date(dateStr);
    
    switch (groupFormat) {
      case 'hour':
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      case 'day':
        return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
      case 'week':
        return `${date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}`;
      case 'month':
        return date.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' });
      default:
        return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    }
  };

  const calculateTrend = () => {
    if (!data?.charts[type] || data.charts[type].length < 2) return { trend: 'neutral', percentage: 0 };
    
    const chartData = data.charts[type];
    const firstHalf = chartData.slice(0, Math.floor(chartData.length / 2));
    const secondHalf = chartData.slice(Math.floor(chartData.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, item) => sum + item.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, item) => sum + item.value, 0) / secondHalf.length;
    
    if (firstAvg === 0) return { trend: 'neutral', percentage: 0 };
    
    const percentage = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (Math.abs(percentage) < 5) return { trend: 'neutral', percentage: 0 };
    
    return {
      trend: percentage > 0 ? 'up' : 'down',
      percentage: Math.abs(percentage)
    };
  };

  const trend = calculateTrend();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">
            {formatXAxisDate(label, data?.groupFormat || 'day')}
          </p>
          <p className="text-sm text-muted-foreground">
            {config.formatTooltip(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="animate-fade-in">
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
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">{config.title}</CardTitle>
        </div>
        <div className="flex gap-1">
          {periods.map((period) => (
            <Button
              key={period.key}
              variant={selectedPeriod === period.key ? "default" : "ghost"}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setSelectedPeriod(period.key)}
            >
              {period.shortLabel}
            </Button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Total Value */}
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">
              {data ? config.formatValue(data.totals[type]) : '---'}
            </div>
            {trend.trend !== 'neutral' && (
              <Badge 
                variant="outline" 
                className={`gap-1 ${
                  trend.trend === 'up' 
                    ? 'text-green-600 border-green-200 bg-green-50' 
                    : 'text-red-600 border-red-200 bg-red-50'
                }`}
              >
                {trend.trend === 'up' ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {trend.percentage.toFixed(1)}%
              </Badge>
            )}
          </div>

          {/* Chart */}
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.charts[type] || []}>
                <defs>
                  <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="violetGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="purpleTokenGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="purpleRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatXAxisDate(value, data?.groupFormat || 'day')}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => value.toLocaleString('ru-RU')}
                />
                <Tooltip content={<CustomTooltip />} />
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
            {periods.find(p => p.key === selectedPeriod)?.label}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}