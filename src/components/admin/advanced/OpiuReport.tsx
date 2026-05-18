import { useEffect, useState } from "react";
import { DatePickerWithRange } from "@/components/ui/date-picker-range";
import { DateRange } from "react-day-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { fetchSettings, fmtRub, toIsoDate, startOfMonth, endOfMonth } from "@/hooks/useFinanceData";

interface MonthAgg {
  ym: string;
  revenue: number;
  cogs: number;
  marketing: number;
  opex: number;
}

function monthKey(d: string) { return d.slice(0, 7); }

export function OpiuReport() {
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), 0, 1),
    to: endOfMonth(),
  });
  const [months, setMonths] = useState<MonthAgg[]>([]);
  const [taxRate, setTaxRate] = useState(6);
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

  const rowsDef = [
    { key: "revenue", label: "Выручка" },
    { key: "cogs", label: "Себестоимость" },
    { key: "gross", label: "Валовая прибыль", calc: (m: MonthAgg) => m.revenue - m.cogs, bold: true },
    { key: "marketing", label: "Маркетинг" },
    { key: "opex", label: "OPEX" },
    { key: "tax", label: `Налоги (${taxRate}%)`, calc: (m: MonthAgg) => m.revenue * (taxRate / 100) },
    { key: "net", label: "Чистая прибыль", calc: (m: MonthAgg) => m.revenue - m.cogs - m.marketing - m.opex - m.revenue * (taxRate / 100), bold: true },
  ];

  const cellValue = (row: typeof rowsDef[number], m: MonthAgg) =>
    row.calc ? row.calc(m) : (m as any)[row.key] as number;

  return (
    <div className="space-y-4">
      <DatePickerWithRange date={range} onDateChange={setRange} />
      <div className="border rounded-xl overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card">Показатель</TableHead>
              {months.map((m) => (
                <TableHead key={m.ym} className="text-right">{m.ym}</TableHead>
              ))}
              <TableHead className="text-right">Итого</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={months.length + 2} className="text-center text-muted-foreground">Загрузка…</TableCell></TableRow>
            ) : months.length === 0 ? (
              <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-8">Нет данных за период</TableCell></TableRow>
            ) : rowsDef.map((row) => {
              const total = months.reduce((s, m) => s + cellValue(row, m), 0);
              return (
                <TableRow key={row.key} className={row.bold ? "font-semibold bg-muted/30" : ""}>
                  <TableCell className="sticky left-0 bg-card">{row.label}</TableCell>
                  {months.map((m) => (
                    <TableCell key={m.ym} className="text-right">{fmtRub(cellValue(row, m))}</TableCell>
                  ))}
                  <TableCell className="text-right">{fmtRub(total)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
