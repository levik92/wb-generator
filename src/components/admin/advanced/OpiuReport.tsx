import { useEffect, useMemo, useState } from "react";
import { PeriodSelector } from "./PeriodSelector";
import { DateRange } from "react-day-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { fetchSettings, fmtRub, toIsoDate, endOfMonth } from "@/hooks/useFinanceData";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Percent, Wallet } from "lucide-react";

interface MonthAgg {
  ym: string;
  revenue: number;
  cogs: number;
  marketing: number;
  opex: number;
}

function monthKey(d: string) { return d.slice(0, 7); }

const MONTHS_RU = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
function fmtMonth(ym: string) {
  const [y, m] = ym.split("-");
  return `${MONTHS_RU[Number(m) - 1] ?? m} ${y.slice(2)}`;
}

type RowGroup = "income" | "expense" | "result";
interface RowDef {
  key: string;
  label: string;
  group: RowGroup;
  calc?: (m: MonthAgg) => number;
  emphasis?: "bold" | "total";
}

export function OpiuReport() {
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), 0, 1),
    to: endOfMonth(),
  });
  const [months, setMonths] = useState<MonthAgg[]>([]);
  const [taxRate, setTaxRate] = useState(6);
  const [feeRate, setFeeRate] = useState(3);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!range?.from || !range?.to) return;
    (async () => {
      setLoading(true);
      const from = toIsoDate(range.from!);
      const to = toIsoDate(range.to!);
      const fromIso = `${from}T00:00:00`;
      const toIso = `${to}T23:59:59`;
      const [{ data: pays }, { data: exps }, s] = await Promise.all([
        supabase.from("payments").select("amount, created_at").eq("status", "succeeded").gte("created_at", fromIso).lte("created_at", toIso),
        supabase.from("expenses").select("amount, category, expense_date").gte("expense_date", from).lte("expense_date", to),
        fetchSettings(),
      ]);
      setTaxRate(s?.tax_rate ?? 6);
      setFeeRate(s?.payment_fee_rate ?? 3);

      const map: Record<string, MonthAgg> = {};
      const ensure = (ym: string) => (map[ym] ||= { ym, revenue: 0, cogs: 0, marketing: 0, opex: 0 });
      (pays ?? []).forEach((p: any) => { ensure(monthKey(p.created_at)).revenue += Number(p.amount); });
      (exps ?? []).forEach((e: any) => {
        const m = ensure(monthKey(e.expense_date));
        const amt = Number(e.amount);
        if (e.category === "cogs") m.cogs += amt;
        else if (e.category === "marketing") m.marketing += amt;
        else if (e.category === "tax") return;
        else m.opex += amt;
      });
      setMonths(Object.values(map).sort((a, b) => a.ym.localeCompare(b.ym)));
      setLoading(false);
    })();
  }, [range?.from?.getTime(), range?.to?.getTime()]);

  const fee = (m: MonthAgg) => m.revenue * (feeRate / 100);
  const netRev = (m: MonthAgg) => m.revenue - fee(m);
  const taxOf = (m: MonthAgg) => netRev(m) * (taxRate / 100);

  const rowsDef: RowDef[] = [
    { key: "revenue", label: "Выручка (валовая)", group: "income" },
    { key: "fee", label: `Комиссия плат. систем (${feeRate}%)`, group: "expense", calc: (m) => fee(m) },
    { key: "netRev", label: "Выручка после комиссии", group: "result", calc: (m) => netRev(m), emphasis: "bold" },
    { key: "cogs", label: "Себестоимость", group: "expense" },
    { key: "gross", label: "Валовая прибыль", group: "result", calc: (m) => netRev(m) - m.cogs, emphasis: "bold" },
    { key: "marketing", label: "Маркетинг", group: "expense" },
    { key: "opex", label: "OPEX", group: "expense" },
    { key: "tax", label: `Налоги (${taxRate}%)`, group: "expense", calc: (m) => taxOf(m) },
    { key: "net", label: "Чистая прибыль", group: "result", calc: (m) => netRev(m) - m.cogs - m.marketing - m.opex - taxOf(m), emphasis: "total" },
  ];

  const cellValue = (row: RowDef, m: MonthAgg) =>
    row.calc ? row.calc(m) : (m as any)[row.key] as number;

  const totals = useMemo(() => {
    const revenue = months.reduce((s, m) => s + m.revenue, 0);
    const feeTotal = months.reduce((s, m) => s + fee(m), 0);
    const gross = months.reduce((s, m) => s + (netRev(m) - m.cogs), 0);
    const net = months.reduce((s, m) => s + (netRev(m) - m.cogs - m.marketing - m.opex - taxOf(m)), 0);
    return {
      revenue,
      feeTotal,
      net,
      gross,
      grossMargin: revenue > 0 ? (gross / revenue) * 100 : 0,
      netMargin: revenue > 0 ? (net / revenue) * 100 : 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months, taxRate, feeRate]);

  const valueClass = (row: RowDef, v: number) => {
    if (row.group === "expense") return "text-muted-foreground";
    if (row.key === "net") return v >= 0 ? "text-emerald-500" : "text-destructive";
    if (row.key === "gross") return "text-emerald-500/90";
    if (row.key === "revenue") return "text-primary";
    return "";
  };

  const rowBgClass = (row: RowDef) => {
    if (row.emphasis === "total") return "bg-primary/[0.04] border-t-2 border-primary/20";
    if (row.emphasis === "bold") return "bg-muted/40";
    return "";
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <PeriodSelector date={range} onDateChange={setRange} defaultMode="year" />
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryTile icon={<Wallet className="w-4 h-4" />} label="Выручка" value={fmtRub(totals.revenue)} tone="primary" />
        <SummaryTile icon={<TrendingUp className="w-4 h-4" />} label="Валовая прибыль" value={fmtRub(totals.gross)} sub={`${totals.grossMargin.toFixed(1)}% маржа`} tone="emerald" />
        <SummaryTile
          icon={totals.net >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          label="Чистая прибыль"
          value={fmtRub(totals.net)}
          sub={`${totals.netMargin.toFixed(1)}% рентабельность`}
          tone={totals.net >= 0 ? "emerald" : "destructive"}
        />
        <SummaryTile icon={<Percent className="w-4 h-4" />} label="Ставка налога" value={`${taxRate}%`} tone="orange" />
      </div>

      <Card className="bg-card border-border/50 rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg">Отчёт о прибылях и убытках</CardTitle>
          <CardDescription>Помесячная разбивка показателей за выбранный период</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/60">
                  <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground sticky left-0 bg-card z-10 border-r border-border/60 min-w-[180px]">
                    Показатель
                  </TableHead>
                  {months.map((m) => (
                    <TableHead key={m.ym} className="text-[11px] uppercase tracking-wide text-muted-foreground text-right whitespace-nowrap">
                      {fmtMonth(m.ym)}
                    </TableHead>
                  ))}
                  <TableHead className="text-[11px] uppercase tracking-wide text-right bg-muted/40 border-l border-border/60 text-foreground">
                    Итого
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={months.length + 2} className="text-center text-xs text-muted-foreground py-10">Загрузка…</TableCell></TableRow>
                ) : months.length === 0 ? (
                  <TableRow><TableCell colSpan={2} className="text-center text-xs text-muted-foreground py-10">Нет данных за период</TableCell></TableRow>
                ) : rowsDef.map((row) => {
                  const total = months.reduce((s, m) => s + cellValue(row, m), 0);
                  return (
                    <TableRow
                      key={row.key}
                      className={cn(
                        "border-border/40 hover:bg-transparent transition-colors",
                        rowBgClass(row),
                      )}
                    >
                      <TableCell
                        className={cn(
                          "text-xs sticky left-0 z-10 border-r border-border/60 font-medium",
                          row.emphasis ? "text-foreground" : "text-muted-foreground",
                          row.emphasis === "total" ? "bg-primary/[0.04]" : row.emphasis === "bold" ? "bg-muted/40" : "bg-card",
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {row.group === "income" && <span className="w-1 h-3 rounded-sm bg-primary" />}
                          {row.group === "expense" && <span className="w-1 h-3 rounded-sm bg-muted-foreground/40" />}
                          {row.group === "result" && <span className="w-1 h-3 rounded-sm bg-emerald-500" />}
                          {row.label}
                        </span>
                      </TableCell>
                      {months.map((m) => {
                        const v = cellValue(row, m);
                        return (
                          <TableCell
                            key={m.ym}
                            className={cn(
                              "text-xs text-right whitespace-nowrap tabular-nums",
                              valueClass(row, v),
                              row.emphasis && "font-semibold",
                            )}
                          >
                            {v === 0 ? <span className="text-muted-foreground/50">—</span> : fmtRub(v)}
                          </TableCell>
                        );
                      })}
                      <TableCell
                        className={cn(
                          "text-xs text-right whitespace-nowrap tabular-nums font-semibold border-l border-border/60",
                          valueClass(row, total),
                          row.emphasis === "total" ? "bg-primary/[0.06]" : "bg-muted/40",
                        )}
                      >
                        {fmtRub(total)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryTile({
  icon, label, value, sub, tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone: "primary" | "emerald" | "destructive" | "orange";
}) {
  const toneMap = {
    primary: { bg: "bg-primary/10", fg: "text-primary" },
    emerald: { bg: "bg-emerald-500/10", fg: "text-emerald-500" },
    destructive: { bg: "bg-destructive/10", fg: "text-destructive" },
    orange: { bg: "bg-orange-500/10", fg: "text-orange-500" },
  }[tone];
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex items-center gap-2">
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", toneMap.bg, toneMap.fg)}>
          {icon}
        </div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
      <div className={cn("text-lg md:text-xl font-bold mt-2 tabular-nums", toneMap.fg)}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
