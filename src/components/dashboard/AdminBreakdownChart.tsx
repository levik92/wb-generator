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
    if (!range || !range.from) {
      setPendingRange(undefined);
      setIsSelectingRange(false);
      return;
    }
    if (range.from && range.to) {
      const finalFrom = range.from <= range.to ? range.from : range.to;
      const finalTo = range.from <= range.to ? range.to : range.from;
      setPendingRange(undefined);
      setIsSelectingRange(false);
      setDateRange({ from: finalFrom, to: finalTo });
    } else {
      setPendingRange({ from: range.from, to: undefined });
      setIsSelectingRange(true);
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

  const accentColor = type === 'generations' ? COLORS.cards : COLORS.video;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover/95 backdrop-blur-sm border border-border/60 rounded-xl px-3 py-2.5 shadow-xl">
          <p className="text-[11px] font-medium text-muted-foreground mb-1.5">
            {formatXAxisDate(label)}
          </p>
          {(['cards', 'descriptions', 'video'] as const).map(key => {
            const entry = payload.find((p: any) => p.dataKey === key);
            const val = entry?.value || 0;
            return (
              <div key={key} className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[key] }} />
                <span className="text-muted-foreground">{LABELS[key]}:</span>
                <span className="font-semibold tabular-nums text-foreground ml-auto">{val.toLocaleString('ru-RU')}</span>
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
      <Card className="animate-fade-in rounded-2xl border-border/60 bg-card overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-5">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}>
              <Icon className="h-4 w-4" />
            </span>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-0">
          <div className="flex items-center justify-center h-[180px] sm:h-[220px]">
            <div className="w-7 h-7 rounded-full border-[2.5px] border-primary/30 border-t-primary animate-[spin_0.7s_linear_infinite]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in rounded-2xl border-border/60 bg-card overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 gap-2 p-4 sm:p-5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}>
            <Icon className="h-4 w-4" />
          </span>
          <CardTitle className="text-sm font-semibold truncate">{title}</CardTitle>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 px-2.5 text-[11px] gap-1 rounded-full bg-muted/40 hover:bg-muted border-border/60 shrink-0">
              <CalendarIcon className="h-3 w-3" />
              <span className="hidden sm:inline">{formatDateRange()}</span>
              <span className="sm:hidden">Период</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 rounded-xl border-border/60 shadow-xl overflow-hidden" align="end">
            <div className="px-3 pt-3 pb-1 border-b border-border/40 bg-muted/30">
              <div className="text-[11px] font-medium text-muted-foreground">
                {isSelectingRange && pendingRange?.from
                  ? <>Начало: <span className="text-foreground font-semibold tabular-nums">{format(pendingRange.from, "dd.MM.yy", { locale: ru })}</span> · выберите конец периода</>
                  : "Кликните дату начала, затем — дату конца периода"}
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

      <CardContent className="p-4 sm:p-5 pt-0">
        <div className="space-y-3 sm:space-y-4">
          {/* Total */}
          <div className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight">
            {totalValue.toLocaleString('ru-RU')}
          </div>

          {/* Chart */}
          <div className="h-[180px] sm:h-[220px] w-full -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={combinedData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id={`grad-cards-${type}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.cards} stopOpacity={0.28} />
                    <stop offset="95%" stopColor={COLORS.cards} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id={`grad-desc-${type}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.descriptions} stopOpacity={0.28} />
                    <stop offset="95%" stopColor={COLORS.descriptions} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id={`grad-video-${type}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.video} stopOpacity={0.28} />
                    <stop offset="95%" stopColor={COLORS.video} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" vertical={false} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={formatXAxisDate}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(v >= 10000 ? 0 : 1)}k` : v.toLocaleString('ru-RU')}
                  width={40}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: accentColor, strokeOpacity: 0.25, strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="cards"
                  stroke={COLORS.cards}
                  fill={`url(#grad-cards-${type})`}
                  strokeWidth={2.25}
                  animationDuration={1500}
                />
                <Area
                  type="monotone"
                  dataKey="descriptions"
                  stroke={COLORS.descriptions}
                  fill={`url(#grad-desc-${type})`}
                  strokeWidth={2.25}
                  animationDuration={1500}
                />
                <Area
                  type="monotone"
                  dataKey="video"
                  stroke={COLORS.video}
                  fill={`url(#grad-video-${type})`}
                  strokeWidth={2.25}
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px]">
            {(['cards', 'descriptions', 'video'] as const).map(key => (
              <div key={key} className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/50">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[key] }} />
                <span className="text-muted-foreground">{LABELS[key]}</span>
              </div>
            ))}
          </div>

          {/* Period */}
          <p className="text-[11px] text-muted-foreground text-center tabular-nums">
            {formatDateRange()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
