import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet, CreditCard, Receipt } from "lucide-react";

interface UtmPaymentsDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  utmSourceId: string | null;
  sourceName: string;
}

interface PayRow {
  id: string;
  email: string;
  amount: number;
  created_at: string;
  package_name: string;
}

const fmtRub = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;

export function UtmPaymentsDialog({ open, onOpenChange, utmSourceId, sourceName }: UtmPaymentsDialogProps) {
  const [rows, setRows] = useState<PayRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !utmSourceId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Paginate profiles to bypass 1000-row Supabase limit
        const PROFILE_PAGE = 1000;
        const list: { id: string; email: string }[] = [];
        for (let offset = 0; ; offset += PROFILE_PAGE) {
          const { data, error } = await supabase
            .from("profiles")
            .select("id, email")
            .eq("utm_source_id", utmSourceId)
            .order("id", { ascending: true })
            .range(offset, offset + PROFILE_PAGE - 1);
          if (error) { console.error("UTM payments profiles error:", error); break; }
          const rows = (data || []) as { id: string; email: string }[];
          list.push(...rows);
          if (rows.length < PROFILE_PAGE) break;
          if (cancelled) return;
        }
        const emailMap = new Map(list.map(p => [p.id, p.email]));
        const ids = list.map(p => p.id);
        const all: PayRow[] = [];
        const CHUNK = 100;
        const PAY_PAGE = 1000;
        for (let i = 0; i < ids.length; i += CHUNK) {
          const chunk = ids.slice(i, i + CHUNK);
          for (let payOffset = 0; ; payOffset += PAY_PAGE) {
            const { data: pays, error: payErr } = await supabase
              .from("payments")
              .select("id, user_id, amount, created_at, package_name")
              .in("user_id", chunk)
              .eq("status", "succeeded")
              .order("created_at", { ascending: false })
              .range(payOffset, payOffset + PAY_PAGE - 1);
            if (payErr) { console.error("UTM payments fetch error:", payErr); break; }
            const rows = (pays || []) as any[];
            for (const p of rows) {
              all.push({
                id: p.id,
                email: emailMap.get(p.user_id) || "—",
                amount: Number(p.amount || 0),
                created_at: p.created_at,
                package_name: p.package_name,
              });
            }
            if (rows.length < PAY_PAGE) break;
            if (cancelled) return;
          }
        }
        all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        if (!cancelled) setRows(all);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, utmSourceId]);

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const avg = rows.length ? total / rows.length : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl border-border/50 bg-card">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border/50">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-violet-500" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-semibold truncate">Оплаты по источнику</DialogTitle>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{sourceName}</p>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="min-h-[200px] flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-[2.5px] border-primary/30 border-t-primary animate-[spin_0.7s_linear_infinite]" />
          </div>
        ) : (
          <>
            {/* Stats summary */}
            <div className="grid grid-cols-3 gap-2 px-5 py-4 border-b border-border/50">
              <div className="p-2.5 rounded-lg bg-violet-500/5 border border-violet-500/10 text-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">Всего сумма</p>
                <p className="text-sm font-bold text-violet-500">{fmtRub(total)}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10 text-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">Оплат</p>
                <p className="text-sm font-bold text-amber-500">{rows.length}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">Средний чек</p>
                <p className="text-sm font-bold text-emerald-500">{fmtRub(avg)}</p>
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
                <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  <Receipt className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">Оплат пока нет</p>
                <p className="text-xs text-muted-foreground mt-1">По этому источнику ещё не было успешных платежей</p>
              </div>
            ) : (
              <div className="max-h-[55vh] overflow-y-auto px-3 py-3 space-y-1.5">
                {rows.map(r => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/30 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{r.email}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">{r.package_name}</Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-violet-500 whitespace-nowrap shrink-0">{fmtRub(r.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
