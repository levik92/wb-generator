import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, Coins, CalendarIcon } from "lucide-react";
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

interface BreakdownData {
  groupFormat: string;
  generationsByType: {
    cards: ChartData[];
    descriptions: ChartData[];
    video: ChartData[];
  };
  tokensByType: {
    cards: ChartData[];
    descriptions: ChartData[];
    video: ChartData[];
  };
  totalsByType: {
    generationsCards: number;
    generationsDescriptions: number;
    generationsVideo: number;
    tokensCards: number;
    tokensDescriptions: number;
    tokensVideo: number;
  };
}

interface AdminBreakdownChartProps {
  type: 'generations' | 'tokens';
}

const COLORS = {
  cards: '#8b5cf6',
  descriptions: '#06b6d4',
  video: '#f59e0b',
};

const LABELS = {
  cards: 'Изображения',
  descriptions: 'Описания',
  video: 'Видео',
};

export function AdminBreakdownChart({ type }: AdminBreakdownChartProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { from: weekAgo, to: now };
  });
  const [data, setData] = useState<BreakdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(undefined);

  const title = type === 'generations' ? 'Запросы к AI' : 'Потрачено токенов';
  const Icon = type === 'generations' ? Activity : Coins;

  const handleCalendarSelect = (range: DateRange | undefined) => {
    if (!range) {
      setPendingRange(undefined);
      setIsSelectingRange(false);
      return;
    }
    if (!isSelectingRange) {
      setPendingRange({ from: range.from, to: undefined });
      setIsSelectingRange(true);
    } else {
      const from = pendingRange?.from || range.from;
      const to = range.to || range.from;
      setPendingRange(undefined);
      setIsSelectingRange(false);
      if (from && to) {
        const finalFrom = from <= to ? from : to;
        const finalTo = from <= to ? to : from;
        setDateRange({ from: finalFrom, to: finalTo });
      }
    }
  };

  const displayedRange = isSelectingRange ? pendingRange : dateRange;

  useEffect(() => {
    if (!isSelectingRange && dateRange?.from && dateRange?.to) {
      loadData();
    }
  }, [dateRange?.from?.getTime(), dateRange?.to?.getTime(), isSelectingRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const formatLocalDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const { data: result, error } = await supabase.functions.invoke('admin-analytics', {
        body: {
          period: 'custom',
          startDateCustom: formatLocalDate(dateRange!.from!),
          endDateCustom: formatLocalDate(dateRange!.to!),
        }
      });
      if (error) throw error;
      setData(result);
    } catch (error) {
      console.error('Error loading breakdown analytics:', error);
      toast({ title: "Ошибка", description: "Не удалось загрузить аналитику", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const formatDateRange = () => {
    if (!dateRange?.from) return "Выбрать даты";
    if (!dateRange?.to) return format(dateRange.from, "dd.MM.yy", { locale: ru });
    return `${format(dateRange.from, "dd.MM.yy", { locale: ru })} - ${format(dateRange.to, "dd.MM.yy", { locale: ru })}`;
  };

  const formatXAxisDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const gf = data?.groupFormat || 'day';
    const options: Intl.DateTimeFormatOptions = { timeZone: 'Europe/Moscow' };
    if (gf === 'hour') return date.toLocaleTimeString('ru-RU', { ...options, hour: '2-digit', minute: '2-digit' });
    if (gf === 'month') return date.toLocaleDateString('ru-RU', { ...options, month: 'short', year: '2-digit' });
    return date.toLocaleDateString('ru-RU', { ...options, day: '2-digit', month: '2-digit' });
  };

  // Build combined chart data
  const byType = type === 'generations' ? data?.generationsByType : data?.tokensByType;
  const combinedData = byType?.cards?.map((item, i) => ({
    date: item.date,
    cards: item.value,
    descriptions: byType.descriptions?.[i]?.value || 0,
    video: byType.video?.[i]?.value || 0,
  })) || [];

  const totals = data?.totalsByType;
  const totalValue = type === 'generations'
    ? (totals?.generationsCards || 0) + (totals?.generationsDescriptions || 0) + (totals?.generationsVideo || 0)
    : (totals?.tokensCards || 0) + (totals?.tokensDescriptions || 0) + (totals?.tokensVideo || 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground mb-2">
            {formatXAxisDate(label)}
          </p>
          {(['cards', 'descriptions', 'video'] as const).map(key => {
            const entry = payload.find((p: any) => p.dataKey === key);
            const val = entry?.value || 0;
            return (
              <div key={key} className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[key] }} />
                <span className="text-muted-foreground">{LABELS[key]}:</span>
                <span className="font-medium">{val.toLocaleString('ru-RU')}</span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="animate-fade-in bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 px-2 text-xs gap-1">
              <CalendarIcon className="h-3 w-3" />
              {formatDateRange()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={displayedRange}
              onSelect={handleCalendarSelect}
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
          {/* Total */}
          <div className="text-2xl font-bold">
            {totalValue.toLocaleString('ru-RU')}
          </div>

          {/* Chart */}
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={combinedData}>
                <defs>
                  <linearGradient id={`grad-cards-${type}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.cards} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={COLORS.cards} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id={`grad-desc-${type}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.descriptions} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={COLORS.descriptions} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id={`grad-video-${type}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.video} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={COLORS.video} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatXAxisDate}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  tickFormatter={v => v.toLocaleString('ru-RU')}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="cards"
                  stroke={COLORS.cards}
                  fill={`url(#grad-cards-${type})`}
                  strokeWidth={2}
                  animationDuration={1500}
                />
                <Area
                  type="monotone"
                  dataKey="descriptions"
                  stroke={COLORS.descriptions}
                  fill={`url(#grad-desc-${type})`}
                  strokeWidth={2}
                  animationDuration={1500}
                />
                <Area
                  type="monotone"
                  dataKey="video"
                  stroke={COLORS.video}
                  fill={`url(#grad-video-${type})`}
                  strokeWidth={2}
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            {(['cards', 'descriptions', 'video'] as const).map(key => (
              <div key={key} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[key] }} />
                <span>{LABELS[key]}</span>
              </div>
            ))}
          </div>

          {/* Period */}
          <p className="text-xs text-muted-foreground text-center">
            {formatDateRange()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
