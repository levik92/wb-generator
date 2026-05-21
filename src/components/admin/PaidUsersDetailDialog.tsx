import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from "@/components/ui/responsive-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, UserPlus, Repeat } from "lucide-react";
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

  useEffect(() => {
    if (!open || !dateRange?.from || !dateRange?.to) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const fromIso = new Date(dateRange.from!.setHours(0, 0, 0, 0)).toISOString();
        const toIso = new Date(dateRange.to!.setHours(23, 59, 59, 999)).toISOString();

        // 1) Все оплаты в периоде
        const { data: inPeriod } = await supabase
          .from("payments")
          .select("user_id, amount, created_at")
          .eq("status", "succeeded")
          .gte("created_at", fromIso)
          .lte("created_at", toIso)
          .order("created_at", { ascending: false });

        const periodPayments = (inPeriod || []) as { user_id: string; amount: number; created_at: string }[];
        const uniqUsers = Array.from(new Set(periodPayments.map(p => p.user_id)));
        if (uniqUsers.length === 0) {
          if (!cancelled) {
            setNewUsers([]); setRepeatUsers([]); setNewTotal(0); setRepeatTotal(0); setLoading(false);
          }
          return;
        }

        // 2) Для определения «новый» vs «повторный» — первая успешная оплата по каждому
        const firstByUser = new Map<string, string>();
        const CHUNK = 150;
        for (let i = 0; i < uniqUsers.length; i += CHUNK) {
          const ids = uniqUsers.slice(i, i + CHUNK);
          const { data: all } = await supabase
            .from("payments")
            .select("user_id, created_at")
            .eq("status", "succeeded")
            .in("user_id", ids)
            .order("created_at", { ascending: true });
          for (const p of (all || []) as { user_id: string; created_at: string }[]) {
            if (!firstByUser.has(p.user_id)) firstByUser.set(p.user_id, p.created_at);
          }
        }

        // 3) Email-ы
        const emailMap = new Map<string, string>();
        for (let i = 0; i < uniqUsers.length; i += CHUNK) {
          const ids = uniqUsers.slice(i, i + CHUNK);
          const { data: profs } = await supabase
            .from("profiles").select("id, email").in("id", ids);
          for (const p of (profs || []) as { id: string; email: string }[]) emailMap.set(p.id, p.email);
        }

        // 4) Разбивка: «новый» если первая оплата по user_id попадает в период
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

        if (!cancelled) {
          setNewUsers(newR);
          setRepeatUsers(repR);
          setNewTotal(nSum);
          setRepeatTotal(rSum);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, dateRange?.from?.getTime(), dateRange?.to?.getTime()]);

  const renderTable = (rows: UserRow[]) => (
    <div className="overflow-x-auto max-h-[55vh]">
      {rows.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">Нет оплат за период</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Email</TableHead>
              <TableHead className="text-xs text-right">Сумма</TableHead>
              <TableHead className="text-xs whitespace-nowrap">Дата</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={`${r.user_id}-${i}`}>
                <TableCell className="text-xs max-w-[220px] truncate">{r.email}</TableCell>
                <TableCell className="text-xs text-right whitespace-nowrap">{fmtRub(r.amount)}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">
                  {new Date(r.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-2xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Платные пользователи — детализация</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Разбивка оплат по новым и повторным платящим пользователям за выбранный период
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Tabs defaultValue="new" className="w-full">
            <TabsList className="grid grid-cols-2 mb-3 h-auto">
              <TabsTrigger value="new" className="gap-1.5 text-[11px] sm:text-xs px-2 py-1.5 whitespace-normal sm:whitespace-nowrap">
                <UserPlus className="w-3.5 h-3.5 shrink-0" />
                <span>Новые ({newUsers.length}) · {fmtRub(newTotal)}</span>
              </TabsTrigger>
              <TabsTrigger value="repeat" className="gap-1.5 text-[11px] sm:text-xs px-2 py-1.5 whitespace-normal sm:whitespace-nowrap">
                <Repeat className="w-3.5 h-3.5 shrink-0" />
                <span>Повторные ({repeatUsers.length}) · {fmtRub(repeatTotal)}</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="new">{renderTable(newUsers)}</TabsContent>
            <TabsContent value="repeat">{renderTable(repeatUsers)}</TabsContent>
          </Tabs>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
