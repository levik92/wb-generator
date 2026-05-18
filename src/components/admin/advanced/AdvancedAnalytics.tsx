import { useEffect, useMemo, useState } from "react";
import { ChevronRight, TrendingUp, Wallet, Receipt, Megaphone } from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-picker-range";
import { DateRange } from "react-day-picker";
import {
  startOfMonth, endOfMonth, usePeriodMetrics, fmtRub,
  fetchRevenueDaily, fetchExpensesRange, toIsoDate,
  type Expense,
} from "@/hooks/useFinanceData";
import { GlassCard } from "@/components/dashboard/GlassCard";
import { ExpensesManager } from "./ExpensesManager";
import { MarketingManager } from "./MarketingManager";
import { OpiuReport } from "./OpiuReport";
import { DdsReport } from "./DdsReport";
import { FinanceSettingsCard } from "./FinanceSettingsCard";
import { setAdminHeaderOverride } from "@/stores/adminHeaderOverride";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, Legend,
} from "recharts";

type Section = "rnp" | "opiu" | "dds" | "expenses" | "marketing";

interface Props {
  onBack: () => void;
}

export function AdvancedAnalytics({ onBack }: Props) {
  const [section, setSection] = useState<Section>("rnp");
  const [range, setRange] = useState<DateRange | undefined>({
    from: startOfMonth(),
    to: endOfMonth(),
  });

  const titleMap: Record<Section, string> = {
    rnp: "РНП — рука на пульсе",
    opiu: "ОПиУ — отчёт о прибылях и убытках",
    dds: "ДДС — движение денежных средств",
    expenses: "Расходы",
    marketing: "Маркетинг",
  };

  const handleBack = () => {
    if (section !== "rnp") setSection("rnp");
    else onBack();
  };

  useEffect(() => {
    setAdminHeaderOverride({
      title: titleMap[section],
      subtitle: "Расширенная аналитика",
      onBack: handleBack,
    });
    return () => setAdminHeaderOverride(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  return (
    <div className="space-y-4 md:space-y-6">
      {section === "rnp" && (
        <RnpDashboard range={range} setRange={setRange} onOpen={setSection} />
      )}
      {section === "opiu" && <OpiuReport />}
      {section === "dds" && <DdsReport />}
      {section === "expenses" && <ExpensesManager />}
      {section === "marketing" && <MarketingManager />}
    </div>
  );
}

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "#f59e0b", "#10b981", "#6366f1", "#ec4899", "#94a3b8"];

function RnpDashboard({
  range,
  setRange,
  onOpen,
}: {
  range: DateRange | undefined;
  setRange: (r: DateRange | undefined) => void;
  onOpen: (s: Section) => void;
}) {
  const { metrics, loading, settings, reload } = usePeriodMetrics(range?.from, range?.to);
  const [daily, setDaily] = useState<{ date: string; amount: number }[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    if (!range?.from || !range?.to) return;
    const f = toIsoDate(range.from);
    const t = toIsoDate(range.to);
    fetchRevenueDaily(f, t).then(setDaily);
    fetchExpensesRange(f, t).then(setExpenses);
  }, [range?.from?.getTime(), range?.to?.getTime()]);

  const kpis = useMemo(() => {
    if (!metrics) return [];
    return [
      { label: "Выручка", value: fmtRub(metrics.revenue), accent: "text-primary" },
      { label: "Валовая прибыль", value: fmtRub(metrics.grossProfit), sub: `${metrics.grossMarginPct.toFixed(1)}% маржа`, accent: "text-emerald-500" },
      { label: `Налоги (${settings?.tax_rate ?? 6}%)`, value: fmtRub(metrics.taxes), accent: "text-orange-500" },
      {
        label: "Чистая прибыль",
        value: fmtRub(metrics.netProfit),
        sub: `${metrics.netMarginPct.toFixed(1)}% рентабельность`,
        accent: metrics.netProfit >= 0 ? "text-emerald-500" : "text-destructive",
      },
    ];
  }, [metrics, settings]);

  const expensesByCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of expenses) m.set(e.category, (m.get(e.category) ?? 0) + Number(e.amount));
    const labels: Record<string, string> = {
      cogs: "Себестоимость", marketing: "Маркетинг", salary_admin: "Зарплаты",
      accounting: "Бухгалтерия", representative: "Представит.", tax: "Налоги (ручн.)", other: "Прочее",
    };
    return Array.from(m.entries()).map(([k, v]) => ({ name: labels[k] ?? k, value: Math.round(v) }));
  }, [expenses]);

  const profitBars = useMemo(() => {
    if (!metrics) return [];
    return [
      { name: "Выручка", value: Math.round(metrics.revenue) },
      { name: "Себест.", value: Math.round(metrics.cogs) },
      { name: "Маркетинг", value: Math.round(metrics.marketing) },
      { name: "OPEX", value: Math.round(metrics.opex) },
      { name: "Налоги", value: Math.round(metrics.taxes) },
      { name: "Чистая", value: Math.round(metrics.netProfit) },
    ];
  }, [metrics]);

  const tiles: { id: Section; icon: React.ReactNode; label: string; desc: string }[] = [
    { id: "opiu", icon: <TrendingUp className="w-5 h-5" />, label: "ОПиУ", desc: "Помесячный P&L отчёт" },
    { id: "dds", icon: <Wallet className="w-5 h-5" />, label: "ДДС", desc: "Движение денежных средств" },
    { id: "expenses", icon: <Receipt className="w-5 h-5" />, label: "Расходы", desc: "Учёт и категоризация расходов" },
    { id: "marketing", icon: <Megaphone className="w-5 h-5" />, label: "Маркетинг", desc: "Каналы, доход, ROI" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 items-center justify-end">
        <FinanceSettingsCard onSaved={reload} />
        <DatePickerWithRange date={range} onDateChange={setRange} />
      </div>

      {loading || !metrics ? (
        <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Загрузка…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {kpis.map((c) => (
              <GlassCard key={c.label}>
                <div className="p-4">
                  <div className="text-xs text-muted-foreground">{c.label}</div>
                  <div className={`text-xl md:text-2xl font-bold mt-1 ${c.accent}`}>{c.value}</div>
                  {c.sub && <div className="text-xs text-muted-foreground mt-1">{c.sub}</div>}
                </div>
              </GlassCard>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GlassCard>
              <div className="p-4">
                <div className="text-sm font-semibold mb-3">Выручка по дням</div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={daily}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}к`} />
                      <Tooltip
                        formatter={(v: any) => [fmtRub(Number(v)), "Сумма"]}
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      />
                      <Area type="monotone" dataKey="amount" name="Сумма" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#revGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="p-4">
                <div className="text-sm font-semibold mb-3">Структура расходов</div>
                <div className="h-64">
                  {expensesByCat.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      Нет расходов за период
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={expensesByCat} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                          {expensesByCat.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => fmtRub(Number(v))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </GlassCard>
          </div>

          <GlassCard>
            <div className="p-4">
              <div className="text-sm font-semibold mb-3">P&L разрез за период</div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={profitBars}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}к`} />
                    <Tooltip formatter={(v: any) => fmtRub(Number(v))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {profitBars.map((b, i) => (
                        <Cell key={i} fill={
                          b.name === "Выручка" ? "hsl(var(--primary))" :
                          b.name === "Чистая" ? (metrics.netProfit >= 0 ? "#10b981" : "hsl(var(--destructive))") :
                          "hsl(var(--muted-foreground) / 0.6)"
                        } />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </GlassCard>
        </>
      )}

      <div className="pt-2">
        <div className="text-sm font-semibold mb-3 text-muted-foreground">Детальные отчёты и таблицы</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tiles.map((t) => (
            <button
              key={t.id}
              onClick={() => onOpen(t.id)}
              className="group flex items-center gap-4 text-left p-4 rounded-2xl border border-border/60 bg-card hover:border-primary/50 hover:bg-primary/[0.03] hover:shadow-md transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {t.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground flex items-center gap-2">
                  {t.label}
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">таблица</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">{t.desc}</div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
