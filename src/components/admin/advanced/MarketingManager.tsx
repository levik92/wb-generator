import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, RefreshCw } from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-picker-range";
import { DateRange } from "react-day-picker";
import { fmtRub, toIsoDate, startOfMonth, endOfMonth, MarketingChannel, MarketingRevenue } from "@/hooks/useFinanceData";
import { toast } from "@/hooks/use-toast";

interface ChannelAgg {
  channel: MarketingChannel;
  cost: number;
  revenue: number;
  roi: number | null;
}

export function MarketingManager() {
  const [range, setRange] = useState<DateRange | undefined>({ from: startOfMonth(), to: endOfMonth() });
  const [aggs, setAggs] = useState<ChannelAgg[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MarketingChannel | null>(null);
  const [revenueDialog, setRevenueDialog] = useState<{ channel: MarketingChannel } | null>(null);

  const load = async () => {
    if (!range?.from || !range?.to) return;
    setLoading(true);
    const from = toIsoDate(range.from);
    const to = toIsoDate(range.to);
    const fromIso = `${from}T00:00:00`;
    const toIso = `${to}T23:59:59`;

    const [{ data: channels }, { data: expenses }, { data: revs }] = await Promise.all([
      supabase.from("marketing_channels").select("*").order("name"),
      supabase.from("expenses").select("*").eq("category", "marketing").gte("expense_date", from).lte("expense_date", to),
      supabase.from("marketing_revenues").select("*").gte("period_month", from).lte("period_month", to),
    ]);

    const byChannelCost: Record<string, number> = {};
    (expenses ?? []).forEach((e: any) => {
      if (e.channel_id) byChannelCost[e.channel_id] = (byChannelCost[e.channel_id] || 0) + Number(e.amount);
    });
    const byChannelRev: Record<string, number> = {};
    (revs ?? []).forEach((r: any) => {
      byChannelRev[r.channel_id] = (byChannelRev[r.channel_id] || 0) + Number(r.amount);
    });

    const list: ChannelAgg[] = (channels ?? []).map((c: any) => {
      const cost = byChannelCost[c.id] || 0;
      const revenue = byChannelRev[c.id] || 0;
      const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : null;
      return { channel: c, cost, revenue, roi };
    });
    setAggs(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, [range?.from?.getTime(), range?.to?.getTime()]);

  // Auto-refresh when user returns to tab/window or component remounts focus
  useEffect(() => {
    const onFocus = () => load();
    const onVisibility = () => { if (document.visibilityState === "visible") load(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [range?.from?.getTime(), range?.to?.getTime()]);

  // Realtime: refresh when expenses or revenues change
  useEffect(() => {
    const ch = supabase
      .channel("marketing-manager-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "marketing_revenues" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "marketing_channels" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [range?.from?.getTime(), range?.to?.getTime()]);

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить канал? Связанные данные сохранятся.")) return;
    await supabase.from("marketing_channels").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" onClick={() => setEditing(null)}>
              <Plus className="w-4 h-4" /> Добавить канал
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editing ? "Редактировать канал" : "Новый канал"}</DialogTitle></DialogHeader>
            <ChannelForm initial={editing} onSaved={() => { setOpen(false); setEditing(null); load(); }} />
          </DialogContent>
        </Dialog>
        <DatePickerWithRange date={range} onDateChange={setRange} />
      </div>

      <Card className="bg-card border-border/50 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Каналы маркетинга</CardTitle>
          <CardDescription>Расход, доход и ROI по каналам ({aggs.length})</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Канал</TableHead>
                  <TableHead className="text-xs">Тег</TableHead>
                  <TableHead className="text-xs text-right">Расход</TableHead>
                  <TableHead className="text-xs text-right">Доход</TableHead>
                  <TableHead className="text-xs text-right">ROI</TableHead>
                  <TableHead className="w-[160px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">Загрузка…</TableCell></TableRow>
                ) : aggs.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">Нет каналов</TableCell></TableRow>
                ) : aggs.map((a) => (
                  <TableRow key={a.channel.id}>
                    <TableCell className="text-xs font-medium">{a.channel.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.channel.tag || "—"}</TableCell>
                    <TableCell className="text-xs text-right whitespace-nowrap">{fmtRub(a.cost)}</TableCell>
                    <TableCell className="text-xs text-right whitespace-nowrap">{fmtRub(a.revenue)}</TableCell>
                    <TableCell className={`text-xs text-right font-semibold whitespace-nowrap ${a.roi === null ? "text-muted-foreground" : a.roi >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                      {a.roi === null ? "—" : `${a.roi.toFixed(1)}%`}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setRevenueDialog({ channel: a.channel })}>Доход</Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(a.channel); setOpen(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleDelete(a.channel.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!revenueDialog} onOpenChange={(o) => !o && setRevenueDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Доход канала «{revenueDialog?.channel.name}»</DialogTitle></DialogHeader>
          {revenueDialog && (
            <RevenuesEditor channel={revenueDialog.channel} onChange={load} onClose={() => setRevenueDialog(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChannelForm({ initial, onSaved }: { initial: MarketingChannel | null; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [tag, setTag] = useState(initial?.tag ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      toast({ title: "Укажите название", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = { name: name.trim(), tag: tag.trim() || null, notes: notes.trim() || null };
    const op = initial
      ? supabase.from("marketing_channels").update(payload).eq("id", initial.id)
      : supabase.from("marketing_channels").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) {
      toast({ title: "Ошибка", variant: "destructive" });
      return;
    }
    onSaved();
  };

  return (
    <div className="space-y-3">
      <div><Label className="text-xs">Название</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div><Label className="text-xs">Тег</Label><Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Например: yandex, telegram" /></div>
      <div><Label className="text-xs">Заметка</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
      <Button onClick={save} disabled={saving} className="w-full">{saving ? "Сохраняем…" : "Сохранить"}</Button>
    </div>
  );
}

function RevenuesEditor({ channel, onChange, onClose }: { channel: MarketingChannel; onChange: () => void; onClose: () => void }) {
  const [rows, setRows] = useState<MarketingRevenue[]>([]);
  const [month, setMonth] = useState<string>(toIsoDate(startOfMonth()));
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("marketing_revenues").select("*").eq("channel_id", channel.id).order("period_month", { ascending: false });
    setRows((data ?? []) as MarketingRevenue[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [channel.id]);

  const add = async () => {
    if (!amount) return;
    const m = month.slice(0, 7) + "-01";
    const { error } = await supabase
      .from("marketing_revenues")
      .upsert({ channel_id: channel.id, period_month: m, amount: Number(amount) }, { onConflict: "channel_id,period_month" });
    if (error) {
      toast({ title: "Ошибка", variant: "destructive" });
      return;
    }
    setAmount("");
    load();
    onChange();
  };

  const remove = async (id: string) => {
    await supabase.from("marketing_revenues").delete().eq("id", id);
    load();
    onChange();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input type="month" value={month.slice(0, 7)} onChange={(e) => setMonth(e.target.value + "-01")} className="flex-1" />
        <Input type="number" placeholder="Сумма ₽" value={amount} onChange={(e) => setAmount(e.target.value)} className="flex-1" />
        <Button onClick={add}>Внести</Button>
      </div>
      <div className="max-h-64 overflow-auto border rounded-lg">
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Загрузка…</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Записей нет</div>
        ) : rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between p-2 border-b last:border-0">
            <div className="text-sm">{r.period_month.slice(0, 7)}</div>
            <div className="text-sm font-medium">{fmtRub(Number(r.amount))}</div>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => remove(r.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <Button variant="outline" className="w-full" onClick={onClose}>Закрыть</Button>
    </div>
  );
}
