import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ExpenseCategory =
  | "cogs"
  | "salary_admin"
  | "marketing"
  | "representative"
  | "tax"
  | "accounting"
  | "other";

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; isCogs?: boolean; isMarketing?: boolean }[] = [
  { value: "cogs", label: "Себестоимость (API, серверы, софт)", isCogs: true },
  { value: "marketing", label: "Маркетинг / продвижение", isMarketing: true },
  { value: "salary_admin", label: "Зарплаты (административные)" },
  { value: "accounting", label: "Бухгалтерия" },
  { value: "representative", label: "Представительские / поездки" },
  { value: "tax", label: "Налоги (ручные)" },
  { value: "other", label: "Прочее" },
];

export const categoryLabel = (c: string) =>
  EXPENSE_CATEGORIES.find((x) => x.value === c)?.label ?? c;

export interface Expense {
  id: string;
  expense_date: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
  tag: string | null;
  channel_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface MarketingChannel {
  id: string;
  name: string;
  tag: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order?: number;
}

export interface MarketingRevenue {
  id: string;
  channel_id: string;
  period_month: string;
  amount: number;
  notes: string | null;
}

export interface FinanceSettings {
  id: string;
  tax_rate: number;
  starting_cash: number;
  payment_fee_rate: number;
}

export interface PeriodMetrics {
  revenue: number;
  paymentFee: number;
  netRevenue: number;
  cogs: number;
  marketing: number;
  opex: number;
  taxes: number;
  grossProfit: number;
  grossMarginPct: number;
  netProfit: number;
  netMarginPct: number;
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
export function endOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

async function fetchRevenue(from: string, to: string): Promise<number> {
  const fromIso = `${from}T00:00:00`;
  const toIso = `${to}T23:59:59`;
  // Счета по invoice_payments автоматически создают запись в payments
  // (payment_provider='manual_invoice'), поэтому считаем только payments чтобы избежать задвоения.
  const { data } = await supabase
    .from("payments")
    .select("amount")
    .eq("status", "succeeded")
    .gte("created_at", fromIso)
    .lte("created_at", toIso);
  return (data ?? []).reduce((s, r: any) => s + Number(r.amount || 0), 0);
}

export async function fetchRevenueDaily(from: string, to: string): Promise<{ date: string; amount: number }[]> {
  const fromIso = `${from}T00:00:00`;
  const toIso = `${to}T23:59:59`;
  const { data } = await supabase
    .from("payments")
    .select("amount, created_at")
    .eq("status", "succeeded")
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: true });
  const map = new Map<string, number>();
  for (const r of (data ?? []) as any[]) {
    const d = String(r.created_at).slice(0, 10);
    map.set(d, (map.get(d) ?? 0) + Number(r.amount || 0));
  }
  return Array.from(map.entries()).map(([date, amount]) => ({ date, amount }));
}

export async function fetchExpensesRange(from: string, to: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .gte("expense_date", from)
    .lte("expense_date", to)
    .order("expense_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Expense[];
}

export async function fetchSettings(): Promise<FinanceSettings | null> {
  const { data } = await supabase.from("finance_settings").select("*").limit(1).maybeSingle();
  return (data as any) ?? null;
}

export function computeMetrics(
  revenue: number,
  expenses: Expense[],
  taxRate: number,
  paymentFeeRate: number = 0,
): PeriodMetrics {
  let cogs = 0;
  let marketing = 0;
  let opex = 0;
  for (const e of expenses) {
    const amt = Number(e.amount);
    if (e.category === "cogs") cogs += amt;
    else if (e.category === "marketing") marketing += amt;
    else if (e.category === "tax") continue;
    else opex += amt;
  }
  const paymentFee = revenue * (paymentFeeRate / 100);
  const netRevenue = revenue - paymentFee;
  const taxes = netRevenue * (taxRate / 100);
  const grossProfit = netRevenue - cogs;
  const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netProfit = netRevenue - cogs - marketing - opex - taxes;
  const netMarginPct = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  return { revenue, paymentFee, netRevenue, cogs, marketing, opex, taxes, grossProfit, grossMarginPct, netProfit, netMarginPct };
}

export function usePeriodMetrics(from: Date | undefined, to: Date | undefined) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<PeriodMetrics | null>(null);
  const [settings, setSettings] = useState<FinanceSettings | null>(null);

  const reload = useCallback(async () => {
    if (!from || !to) return;
    setLoading(true);
    try {
      const f = toIsoDate(from);
      const t = toIsoDate(to);
      const [revenue, expenses, s] = await Promise.all([
        fetchRevenue(f, t),
        fetchExpensesRange(f, t),
        fetchSettings(),
      ]);
      setSettings(s);
      setMetrics(computeMetrics(revenue, expenses, s?.tax_rate ?? 6, s?.payment_fee_rate ?? 0));
    } finally {
      setLoading(false);
    }
  }, [from?.getTime(), to?.getTime()]);

  useEffect(() => { reload(); }, [reload]);

  return { loading, metrics, settings, reload };
}

export const fmtRub = (n: number) =>
  `${Math.round(n).toLocaleString("ru-RU")} ₽`;
