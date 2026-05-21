import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

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
        const { data: profs } = await supabase
          .from("profiles").select("id, email").eq("utm_source_id", utmSourceId);
        const list = (profs || []) as { id: string; email: string }[];
        const emailMap = new Map(list.map(p => [p.id, p.email]));
        const ids = list.map(p => p.id);
        const all: PayRow[] = [];
        const CHUNK = 150;
        for (let i = 0; i < ids.length; i += CHUNK) {
          const chunk = ids.slice(i, i + CHUNK);
          const { data: pays } = await supabase
            .from("payments")
            .select("id, user_id, amount, created_at, package_name")
            .in("user_id", chunk)
            .eq("status", "succeeded")
            .order("created_at", { ascending: false });
          for (const p of (pays || []) as any[]) {
            all.push({
              id: p.id,
              email: emailMap.get(p.user_id) || "—",
              amount: Number(p.amount || 0),
              created_at: p.created_at,
              package_name: p.package_name,
            });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Оплаты по источнику «{sourceName}»</DialogTitle>
          <DialogDescription>
            Всего: {rows.length} оплат на сумму {fmtRub(total)}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Оплат пока нет</p>
        ) : (
          <div className="overflow-x-auto max-h-[55vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Тариф</TableHead>
                  <TableHead className="text-xs text-right">Сумма</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs max-w-[200px] truncate">{r.email}</TableCell>
                    <TableCell className="text-xs">{r.package_name}</TableCell>
                    <TableCell className="text-xs text-right whitespace-nowrap">{fmtRub(r.amount)}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
