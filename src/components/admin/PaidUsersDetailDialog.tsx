import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, UserPlus, Repeat, Receipt, TrendingUp, Percent, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DateRange } from "react-day-picker";

interface PaidUsersDetailDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  dateRange?: DateRange;
}

interface UserRow {
  user_id: string;
  email: string;
  amount: number;
  date: string;
}

const fmtRub = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;

export function PaidUsersDetailDialog({ open, onOpenChange, dateRange }: PaidUsersDetailDialogProps) {
  const [loading, setLoading] = useState(true);
  const [newUsers, setNewUsers] = useState<UserRow[]>([]);
  const [repeatUsers, setRepeatUsers] = useState<UserRow[]>([]);
  const [newTotal, setNewTotal] = useState(0);
  const [repeatTotal, setRepeatTotal] = useState(0);
  const [registeredInPeriod, setRegisteredInPeriod] = useState(0);
  const [ltv, setLtv] = useState(0);

  useEffect(() => {
    if (!open || !dateRange?.from || !dateRange?.to) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const fromIso = new Date(new Date(dateRange.from!).setHours(0, 0, 0, 0)).toISOString();
        const toIso = new Date(new Date(dateRange.to!).setHours(23, 59, 59, 999)).toISOString();

        // 1) Payments in period
        const { data: inPeriod } = await supabase
          .from("payments")
          .select("user_id, amount, created_at")
          .eq("status", "succeeded")
          .gte("created_at", fromIso)
          .lte("created_at", toIso)
          .order("created_at", { ascending: false });

        const periodPayments = (inPeriod || []) as { user_id: string; amount: number; created_at: string }[];
        const uniqUsers = Array.from(new Set(periodPayments.map(p => p.user_id)));

        // 2) Registered users count in the same period (for conversion metric)
        const { count: regCount } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .gte("created_at", fromIso)
          .lte("created_at", toIso);

        if (uniqUsers.length === 0) {
          if (!cancelled) {
            setNewUsers([]); setRepeatUsers([]); setNewTotal(0); setRepeatTotal(0);
            setRegisteredInPeriod(regCount || 0); setLtv(0); setLoading(false);
          }
          return;
        }

        // 3) Lifetime payments for these users — for "first payment" check & LTV
        const firstByUser = new Map<string, string>();
        const lifetimeSumByUser = new Map<string, number>();
        const CHUNK = 150;
        for (let i = 0; i < uniqUsers.length; i += CHUNK) {
          const ids = uniqUsers.slice(i, i + CHUNK);
          const { data: all } = await supabase
            .from("payments")
            .select("user_id, amount, created_at")
            .eq("status", "succeeded")
            .in("user_id", ids)
            .order("created_at", { ascending: true });
          for (const p of (all || []) as { user_id: string; amount: number; created_at: string }[]) {
            if (!firstByUser.has(p.user_id)) firstByUser.set(p.user_id, p.created_at);
            lifetimeSumByUser.set(p.user_id, (lifetimeSumByUser.get(p.user_id) || 0) + Number(p.amount || 0));
          }
        }

        // 4) Emails
        const emailMap = new Map<string, string>();
        for (let i = 0; i < uniqUsers.length; i += CHUNK) {
          const ids = uniqUsers.slice(i, i + CHUNK);
          const { data: profs } = await supabase
            .from("profiles").select("id, email").in("id", ids);
          for (const p of (profs || []) as { id: string; email: string }[]) emailMap.set(p.id, p.email);
        }

        const fromT = new Date(fromIso).getTime();
        const toT = new Date(toIso).getTime();
        const isFirstInPeriod = (uid: string) => {
          const f = firstByUser.get(uid);
          if (!f) return false;
          const t = new Date(f).getTime();
          return t >= fromT && t <= toT;
        };

        const newR: UserRow[] = [];
        const repR: UserRow[] = [];
        let nSum = 0, rSum = 0;
        for (const p of periodPayments) {
          const row: UserRow = {
            user_id: p.user_id,
            email: emailMap.get(p.user_id) || "—",
            amount: Number(p.amount || 0),
            date: p.created_at,
          };
          if (isFirstInPeriod(p.user_id)) {
            newR.push(row); nSum += row.amount;
          } else {
            repR.push(row); rSum += row.amount;
          }
        }

        // LTV across users who paid in period (avg lifetime spend)
        let totalLifetime = 0;
        lifetimeSumByUser.forEach(v => { totalLifetime += v; });
        const ltvValue = uniqUsers.length ? totalLifetime / uniqUsers.length : 0;

        if (!cancelled) {
          setNewUsers(newR);
          setRepeatUsers(repR);
          setNewTotal(nSum);
          setRepeatTotal(rSum);
          setRegisteredInPeriod(regCount || 0);
          setLtv(ltvValue);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, dateRange?.from?.getTime(), dateRange?.to?.getTime()]);

  const totalPayments = newUsers.length + repeatUsers.length;
  const conversion = registeredInPeriod > 0 ? (newUsers.length / registeredInPeriod) * 100 : 0;
  const repeatShare = totalPayments > 0 ? (repeatUsers.length / totalPayments) * 100 : 0;

  const renderList = (rows: UserRow[]) => (
    rows.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
        <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
          <Receipt className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Нет оплат за период</p>
      </div>
    ) : (
      <div className="max-h-[45vh] overflow-y-auto px-3 py-3 space-y-1.5">
        {rows.map((r, i) => (
          <div
            key={`${r.user_id}-${i}`}
            className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/30 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{r.email}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                  {new Date(r.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </Badge>
              </div>
            </div>
            <p className="text-sm font-bold text-violet-500 whitespace-nowrap shrink-0">{fmtRub(r.amount)}</p>
          </div>
        ))}
      </div>
    )
  );

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-2xl p-0 gap-0 overflow-hidden sm:rounded-2xl border-border/50 bg-card">
        <ResponsiveDialogHeader className="px-5 pt-5 pb-4 border-b border-border/50">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="min-w-0 flex-1">
              <ResponsiveDialogTitle className="text-base font-semibold truncate">Платные пользователи</ResponsiveDialogTitle>
              <p className="text-xs text-muted-foreground truncate mt-0.5">Разбивка оплат за выбранный период</p>
            </div>
          </div>
        </ResponsiveDialogHeader>

        {loading ? (
          <div className="min-h-[280px] flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-[2.5px] border-primary/30 border-t-primary animate-[spin_0.7s_linear_infinite]" />
          </div>
        ) : (
          <Tabs defaultValue="new" className="w-full">
            <div className="px-3 sm:px-5 pt-4">
              <TabsList className="grid grid-cols-2 w-full h-auto p-1 bg-muted/60 rounded-xl">
                <TabsTrigger
                  value="new"
                  className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] sm:text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap"
                >
                  <UserPlus className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Новые · {newUsers.length}</span>
                </TabsTrigger>
                <TabsTrigger
                  value="repeat"
                  className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] sm:text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm whitespace-nowrap"
                >
                  <Repeat className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Повторные · {repeatUsers.length}</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="new" className="mt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 px-3 sm:px-5 py-4 border-b border-border/50">
                <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-center">
                  <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
                    <Wallet className="w-3 h-3" /> Сумма
                  </p>
                  <p className="text-sm font-bold text-emerald-500">{fmtRub(newTotal)}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/10 text-center">
                  <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
                    <Percent className="w-3 h-3" /> Конверсия в оплату
                  </p>
                  <p className="text-sm font-bold text-blue-500">{conversion.toFixed(1)}%</p>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10 text-center col-span-2 sm:col-span-1">
                  <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
                    <UserPlus className="w-3 h-3" /> Регистраций
                  </p>
                  <p className="text-sm font-bold text-amber-500">{registeredInPeriod.toLocaleString("ru-RU")}</p>
                </div>
              </div>
              {renderList(newUsers)}
            </TabsContent>

            <TabsContent value="repeat" className="mt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 px-3 sm:px-5 py-4 border-b border-border/50">
                <div className="p-2.5 rounded-lg bg-violet-500/5 border border-violet-500/10 text-center">
                  <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
                    <Wallet className="w-3 h-3" /> Сумма
                  </p>
                  <p className="text-sm font-bold text-violet-500">{fmtRub(repeatTotal)}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-pink-500/5 border border-pink-500/10 text-center">
                  <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
                    <Percent className="w-3 h-3" /> Доля повторных
                  </p>
                  <p className="text-sm font-bold text-pink-500">{repeatShare.toFixed(1)}%</p>
                </div>
                <div className="p-2.5 rounded-lg bg-cyan-500/5 border border-cyan-500/10 text-center col-span-2 sm:col-span-1">
                  <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
                    <TrendingUp className="w-3 h-3" /> LTV за период
                  </p>
                  <p className="text-sm font-bold text-cyan-500">{fmtRub(ltv)}</p>
                </div>
              </div>
              {renderList(repeatUsers)}
            </TabsContent>
          </Tabs>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
