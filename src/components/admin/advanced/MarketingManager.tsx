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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Pencil, RefreshCw, Link2 } from "lucide-react";
import { PeriodSelector } from "./PeriodSelector";
import { DateRange } from "react-day-picker";
import { fmtRub, toIsoDate, startOfMonth, endOfMonth, MarketingChannel, MarketingRevenue } from "@/hooks/useFinanceData";
import { toast } from "@/hooks/use-toast";

interface UtmSource {
  id: string;
  name: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
}

interface ChannelAgg {
  channel: MarketingChannel;
  cost: number;
  manualRevenue: number;
  utmRevenue: number;
  revenue: number;
  clicks: number;
  cpc: number | null;
  roi: number | null;
  linkedUtms: UtmSource[];
}

export function MarketingManager() {
  const [range, setRange] = useState<DateRange | undefined>({ from: startOfMonth(), to: endOfMonth() });
  const [aggs, setAggs] = useState<ChannelAgg[]>([]);
  const [allUtms, setAllUtms] = useState<UtmSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MarketingChannel | null>(null);
  const [revenueDialog, setRevenueDialog] = useState<{ channel: MarketingChannel } | null>(null);
  const [utmDialog, setUtmDialog] = useState<{ channel: MarketingChannel; linked: UtmSource[] } | null>(null);

  const load = async () => {
    if (!range?.from || !range?.to) return;
    setLoading(true);
    const from = toIsoDate(range.from);
    const to = toIsoDate(range.to);
    const fromIso = `${from}T00:00:00`;
    const toIso = `${to}T23:59:59`;

    const [
      { data: channels },
      { data: expenses },
      { data: revs },
      { data: utms },
      { data: links },
      { data: visits },
      { data: payments },
    ] = await Promise.all([
      supabase.from("marketing_channels").select("*").order("name"),
      supabase.from("expenses").select("*").eq("category", "marketing").gte("expense_date", from).lte("expense_date", to),
      supabase.from("marketing_revenues").select("*").gte("period_month", from).lte("period_month", to),
      supabase.from("utm_sources").select("id,name,utm_source,utm_medium,utm_campaign"),
      supabase.from("marketing_channel_utm_sources").select("channel_id,utm_source_id"),
      supabase.from("utm_visits").select("utm_source_id,created_at").gte("created_at", fromIso).lte("created_at", toIso),
      supabase.from("payments").select("user_id,amount,confirmed_at,status").eq("status", "succeeded").gte("confirmed_at", fromIso).lte("confirmed_at", toIso),
    ]);

    // Map payments -> utm_source via profiles.utm_source_id
    const userIds = Array.from(new Set((payments ?? []).map((p: any) => p.user_id)));
    let profMap: Record<string, string | null> = {};
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id,utm_source_id").in("id", userIds);
      (profs ?? []).forEach((p: any) => { profMap[p.id] = p.utm_source_id; });
    }
    const revByUtm: Record<string, number> = {};
    (payments ?? []).forEach((p: any) => {
      const u = profMap[p.user_id];
      if (u) revByUtm[u] = (revByUtm[u] || 0) + Number(p.amount);
    });

    const clicksByUtm: Record<string, number> = {};
    (visits ?? []).forEach((v: any) => {
      if (v.utm_source_id) clicksByUtm[v.utm_source_id] = (clicksByUtm[v.utm_source_id] || 0) + 1;
    });

    const linksByChannel: Record<string, string[]> = {};
    (links ?? []).forEach((l: any) => {
      (linksByChannel[l.channel_id] ||= []).push(l.utm_source_id);
    });

    const utmMap: Record<string, UtmSource> = {};
    (utms ?? []).forEach((u: any) => { utmMap[u.id] = u; });

    const byChannelCost: Record<string, number> = {};
    (expenses ?? []).forEach((e: any) => {
      if (e.channel_id) byChannelCost[e.channel_id] = (byChannelCost[e.channel_id] || 0) + Number(e.amount);
    });
    const byChannelManualRev: Record<string, number> = {};
    (revs ?? []).forEach((r: any) => {
      byChannelManualRev[r.channel_id] = (byChannelManualRev[r.channel_id] || 0) + Number(r.amount);
    });

    const list: ChannelAgg[] = (channels ?? []).map((c: any) => {
      const cost = byChannelCost[c.id] || 0;
      const manualRevenue = byChannelManualRev[c.id] || 0;
      const linkedIds = linksByChannel[c.id] || [];
      const linkedUtms = linkedIds.map((id) => utmMap[id]).filter(Boolean);
      const utmRevenue = linkedIds.reduce((s, id) => s + (revByUtm[id] || 0), 0);
      const clicks = linkedIds.reduce((s, id) => s + (clicksByUtm[id] || 0), 0);
      const revenue = manualRevenue + utmRevenue;
      const cpc = clicks > 0 ? cost / clicks : null;
      const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : null;
      return { channel: c, cost, manualRevenue, utmRevenue, revenue, clicks, cpc, roi, linkedUtms };
    });
    setAggs(list);
    setAllUtms((utms ?? []) as UtmSource[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [range?.from?.getTime(), range?.to?.getTime()]);

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

  useEffect(() => {
    const ch = supabase
      .channel("marketing-manager-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "marketing_revenues" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "marketing_channels" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "marketing_channel_utm_sources" }, () => load())
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={load} disabled={loading} title="Обновить">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Обновить</span>
          </Button>
          <PeriodSelector date={range} onDateChange={setRange} />
        </div>
      </div>

      <Card className="bg-card border-border/50 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Каналы маркетинга</CardTitle>
          <CardDescription>Расход, клики, CPC, доход и ROI по каналам ({aggs.length})</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Канал</TableHead>
                  <TableHead className="text-xs">UTM метки</TableHead>
                  <TableHead className="text-xs text-right">Расход</TableHead>
                  <TableHead className="text-xs text-right">Клики</TableHead>
                  <TableHead className="text-xs text-right">CPC</TableHead>
                  <TableHead className="text-xs text-right">Доход</TableHead>
                  <TableHead className="text-xs text-right">ROI</TableHead>
                  <TableHead className="w-[200px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-6">Загрузка…</TableCell></TableRow>
                ) : aggs.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-8">Нет каналов</TableCell></TableRow>
                ) : aggs.map((a) => (
                  <TableRow key={a.channel.id} className="hover:bg-transparent">
                    <TableCell className="text-xs font-medium">{a.channel.name}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {a.linkedUtms.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : a.linkedUtms.map((u) => (
                          <Badge key={u.id} variant="secondary" className="text-[10px] font-normal">{u.name}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-right whitespace-nowrap">{fmtRub(a.cost)}</TableCell>
                    <TableCell className="text-xs text-right whitespace-nowrap">{a.clicks.toLocaleString("ru-RU")}</TableCell>
                    <TableCell className="text-xs text-right whitespace-nowrap">{a.cpc === null ? "—" : fmtRub(a.cpc)}</TableCell>
                    <TableCell className="text-xs text-right whitespace-nowrap">
                      <div>{fmtRub(a.revenue)}</div>
                      {a.utmRevenue > 0 && a.manualRevenue > 0 && (
                        <div className="text-[10px] text-muted-foreground">UTM {fmtRub(a.utmRevenue)} + ручн. {fmtRub(a.manualRevenue)}</div>
                      )}
                    </TableCell>
                    <TableCell className={`text-xs text-right font-semibold whitespace-nowrap ${a.roi === null ? "text-muted-foreground" : a.roi >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                      {a.roi === null ? "—" : `${a.roi.toFixed(1)}%`}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setUtmDialog({ channel: a.channel, linked: a.linkedUtms })}>
                          <Link2 className="w-3 h-3" /> UTM
                        </Button>
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
          <DialogHeader><DialogTitle>Ручной доход канала «{revenueDialog?.channel.name}»</DialogTitle></DialogHeader>
          {revenueDialog && (
            <RevenuesEditor channel={revenueDialog.channel} onChange={load} onClose={() => setRevenueDialog(null)} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!utmDialog} onOpenChange={(o) => !o && setUtmDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>UTM метки канала «{utmDialog?.channel.name}»</DialogTitle></DialogHeader>
          {utmDialog && (
            <UtmLinker
              channel={utmDialog.channel}
              allUtms={allUtms}
              initialLinked={utmDialog.linked.map((u) => u.id)}
              onSaved={() => { setUtmDialog(null); load(); }}
            />
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

function UtmLinker({
  channel,
  allUtms,
  initialLinked,
  onSaved,
}: {
  channel: MarketingChannel;
  allUtms: UtmSource[];
  initialLinked: string[];
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialLinked));
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const save = async () => {
    setSaving(true);
    const next = Array.from(selected);
    const initial = new Set(initialLinked);
    const toAdd = next.filter((id) => !initial.has(id));
    const toRemove = initialLinked.filter((id) => !selected.has(id));

    if (toRemove.length) {
      await supabase.from("marketing_channel_utm_sources")
        .delete().eq("channel_id", channel.id).in("utm_source_id", toRemove);
    }
    if (toAdd.length) {
      await supabase.from("marketing_channel_utm_sources")
        .insert(toAdd.map((utm_source_id) => ({ channel_id: channel.id, utm_source_id })));
    }
    setSaving(false);
    toast({ title: "Связи сохранены" });
    onSaved();
  };

  const filtered = allUtms.filter((u) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return u.name.toLowerCase().includes(q) || (u.utm_source ?? "").toLowerCase().includes(q) || (u.utm_campaign ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Доход и клики будут автоматически подтягиваться с выбранных UTM меток за выбранный период.
      </p>
      <Input placeholder="Поиск…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="max-h-72 overflow-auto border rounded-lg divide-y">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Нет UTM меток</div>
        ) : filtered.map((u) => (
          <label key={u.id} className="flex items-start gap-2 p-2.5 cursor-pointer hover:bg-muted/50">
            <Checkbox checked={selected.has(u.id)} onCheckedChange={() => toggle(u.id)} className="mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{u.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">
                {[u.utm_source, u.utm_medium, u.utm_campaign].filter(Boolean).join(" / ") || "—"}
              </div>
            </div>
          </label>
        ))}
      </div>
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
      <p className="text-xs text-muted-foreground">
        Доп. ручной доход (если канал не покрыт UTM меткой). Доход от UTM меток считается автоматически.
      </p>
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
