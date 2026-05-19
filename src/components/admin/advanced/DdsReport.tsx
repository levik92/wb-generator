import { useEffect, useState } from "react";
import { PeriodSelector } from "./PeriodSelector";
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { fetchSettings, fmtRub, toIsoDate, startOfMonth, endOfMonth } from "@/hooks/useFinanceData";

export function DdsReport() {
  const [range, setRange] = useState<DateRange | undefined>({ from: startOfMonth(), to: endOfMonth() });
  const [inflow, setInflow] = useState(0);
  const [outflow, setOutflow] = useState(0);
  const [startingCash, setStartingCash] = useState(0);
  const [cashBeforePeriod, setCashBeforePeriod] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!range?.from || !range?.to) return;
    (async () => {
      setLoading(true);
      const from = toIsoDate(range.from!);
      const to = toIsoDate(range.to!);
      const fromIso = `${from}T00:00:00`;
      const toIso = `${to}T23:59:59`;

      const [settings, payIn, exp, payAll, expAll] = await Promise.all([
        fetchSettings(),
        supabase.from("payments").select("amount").eq("status", "succeeded").gte("created_at", fromIso).lte("created_at", toIso),
        supabase.from("expenses").select("amount").gte("expense_date", from).lte("expense_date", to),
        supabase.from("payments").select("amount").eq("status", "succeeded").lt("created_at", fromIso),
        supabase.from("expenses").select("amount").lt("expense_date", from),
      ]);
      const sum = (arr: any) => (arr.data ?? []).reduce((s: number, r: any) => s + Number(r.amount), 0);
      const inf = sum(payIn);
      const outf = sum(exp);
      const before = sum(payAll) - sum(expAll);
      setInflow(inf);
      setOutflow(outf);
      setStartingCash(Number(settings?.starting_cash ?? 0));
      setCashBeforePeriod(before);
      setLoading(false);
    })();
  }, [range?.from?.getTime(), range?.to?.getTime()]);

  const delta = inflow - outflow;
  const balanceStart = startingCash + cashBeforePeriod;
  const balanceEnd = balanceStart + delta;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <PeriodSelector date={range} onDateChange={setRange} />
      </div>
      <Card className="bg-card border-border/50 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Движение денежных средств</CardTitle>
          <CardDescription>Остатки и поток за выбранный период</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">Загрузка…</div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { l: "Остаток на начало", v: fmtRub(balanceStart), c: "text-foreground" },
                { l: "Поступления", v: fmtRub(inflow), c: "text-emerald-500" },
                { l: "Списания", v: fmtRub(outflow), c: "text-destructive" },
                { l: "Остаток на конец", v: fmtRub(balanceEnd), c: balanceEnd >= 0 ? "text-emerald-500" : "text-destructive" },
              ].map((x) => (
                <div key={x.l} className="p-4 rounded-xl border border-border/60 bg-card">
                  <div className="text-xs text-muted-foreground">{x.l}</div>
                  <div className={`text-xl md:text-2xl font-bold mt-1 ${x.c}`}>{x.v}</div>
                </div>
              ))}
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-4">
            Δ за период: <span className={delta >= 0 ? "text-emerald-500" : "text-destructive"}>{fmtRub(delta)}</span>.
            Стартовый остаток компании задаётся в настройках РНП.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
