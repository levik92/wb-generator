import { useEffect, useState } from "react";
import { DatePickerWithRange } from "@/components/ui/date-picker-range";
import { DateRange } from "react-day-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { fetchSettings, fmtRub, toIsoDate, startOfMonth, endOfMonth } from "@/hooks/useFinanceData";
import { GlassCard } from "@/components/dashboard/GlassCard";

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

      const [settings, payIn, invIn, exp, payAll, invAll, expAll] = await Promise.all([
        fetchSettings(),
        supabase.from("payments").select("amount").eq("status", "succeeded").gte("created_at", fromIso).lte("created_at", toIso),
        supabase.from("invoice_payments").select("amount").eq("status", "paid").gte("reviewed_at", fromIso).lte("reviewed_at", toIso),
        supabase.from("expenses").select("amount").gte("expense_date", from).lte("expense_date", to),
        supabase.from("payments").select("amount").eq("status", "succeeded").lt("created_at", fromIso),
        supabase.from("invoice_payments").select("amount").eq("status", "paid").lt("reviewed_at", fromIso),
        supabase.from("expenses").select("amount").lt("expense_date", from),
      ]);
      const sum = (arr: any) => (arr.data ?? []).reduce((s: number, r: any) => s + Number(r.amount), 0);
      const inf = sum(payIn) + sum(invIn);
      const outf = sum(exp);
      const before = sum(payAll) + sum(invAll) - sum(expAll);
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
      <DatePickerWithRange date={range} onDateChange={setRange} />
      {loading ? (
        <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Загрузка…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { l: "Остаток на начало", v: fmtRub(balanceStart), c: "text-foreground" },
            { l: "Поступления", v: fmtRub(inflow), c: "text-emerald-500" },
            { l: "Списания", v: fmtRub(outflow), c: "text-destructive" },
            { l: "Остаток на конец", v: fmtRub(balanceEnd), c: balanceEnd >= 0 ? "text-emerald-500" : "text-destructive" },
          ].map((x) => (
            <GlassCard key={x.l}>
              <div className="p-4">
                <div className="text-xs text-muted-foreground">{x.l}</div>
                <div className={`text-xl md:text-2xl font-bold mt-1 ${x.c}`}>{x.v}</div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
      <div className="text-xs text-muted-foreground">
        Δ за период: <span className={delta >= 0 ? "text-emerald-500" : "text-destructive"}>{fmtRub(delta)}</span>.
        Стартовый остаток компании задаётся в настройках РНП.
      </div>
    </div>
  );
}
