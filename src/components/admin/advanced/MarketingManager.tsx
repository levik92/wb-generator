import { useEffect, useMemo, useState } from "react";
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
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Pencil, RefreshCw, Link2, GripVertical, EyeOff, Eye } from "lucide-react";
import { SortableList, SortableItem } from "@/components/admin/SortableList";
import { PeriodSelector } from "./PeriodSelector";
import { DateRange } from "react-day-picker";
import { fmtRub, toIsoDate, startOfMonth, endOfMonth, MarketingChannel, MarketingRevenue } from "@/hooks/useFinanceData";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  registrations: number;
  cpr: number | null;
  orders: number;
  cpo: number | null;
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

    // Paginate to bypass Supabase 1000-row limit
    const PAGE = 1000;
    const fetchAll = async <T,>(builder: () => any): Promise<T[]> => {
      const out: T[] = [];
      for (let offset = 0; ; offset += PAGE) {
        const { data, error } = await builder().range(offset, offset + PAGE - 1);
        if (error) { console.error("MarketingManager fetch error:", error); break; }
        const rows = (data || []) as T[];
        out.push(...rows);
        if (rows.length < PAGE) break;
      }
      return out;
    };

    const [
      { data: channels },
      { data: expenses },
      { data: revs },
      { data: utms },
      { data: links },
      visits,
      payments,
      regs,
    ] = await Promise.all([
      supabase.from("marketing_channels").select("*").order("sort_order", { ascending: true }).order("name"),
      supabase.from("expenses").select("*").eq("category", "marketing").gte("expense_date", from).lte("expense_date", to),
      supabase.from("marketing_revenues").select("*").gte("period_month", from).lte("period_month", to),
      supabase.from("utm_sources").select("id,name,utm_source,utm_medium,utm_campaign"),
      supabase.from("marketing_channel_utm_sources").select("channel_id,utm_source_id"),
      fetchAll<any>(() => supabase.from("utm_visits").select("utm_source_id,created_at").gte("created_at", fromIso).lte("created_at", toIso).order("created_at", { ascending: true })),
      fetchAll<any>(() => supabase.from("payments").select("user_id,amount,created_at,status").eq("status", "succeeded").gte("created_at", fromIso).lte("created_at", toIso).order("created_at", { ascending: true })),
      fetchAll<any>(() => supabase.from("profiles").select("id,utm_source_id,created_at").not("utm_source_id", "is", null).gte("created_at", fromIso).lte("created_at", toIso).order("created_at", { ascending: true })),
    ]);

    // Map payments -> utm_source via profiles.utm_source_id (paginate over paying users)
    const userIds = Array.from(new Set((payments ?? []).map((p: any) => p.user_id)));
    let profMap: Record<string, string | null> = {};
    if (userIds.length) {
      const CHUNK = 200;
      for (let i = 0; i < userIds.length; i += CHUNK) {
        const ids = userIds.slice(i, i + CHUNK);
        const { data: profs } = await supabase.from("profiles").select("id,utm_source_id").in("id", ids);
        (profs ?? []).forEach((p: any) => { profMap[p.id] = p.utm_source_id; });
      }
    }
    const revByUtm: Record<string, number> = {};
    const ordersByUtm: Record<string, number> = {};
    (payments ?? []).forEach((p: any) => {
      const u = profMap[p.user_id];
      if (u) {
        revByUtm[u] = (revByUtm[u] || 0) + Number(p.amount);
        ordersByUtm[u] = (ordersByUtm[u] || 0) + 1;
      }
    });

    const regsByUtm: Record<string, number> = {};
    (regs ?? []).forEach((r: any) => {
      if (r.utm_source_id) regsByUtm[r.utm_source_id] = (regsByUtm[r.utm_source_id] || 0) + 1;
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
      const registrations = linkedIds.reduce((s, id) => s + (regsByUtm[id] || 0), 0);
      const orders = linkedIds.reduce((s, id) => s + (ordersByUtm[id] || 0), 0);
      const revenue = manualRevenue + utmRevenue;
      const cpc = clicks > 0 ? cost / clicks : null;
      const cpr = registrations > 0 ? cost / registrations : null;
      const cpo = orders > 0 ? cost / orders : null;
      const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : null;
      return { channel: c, cost, manualRevenue, utmRevenue, revenue, clicks, cpc, registrations, cpr, orders, cpo, roi, linkedUtms };
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

  const handleReorder = async (orderedIds: string[]) => {
    // Optimistic: reorder local aggs immediately
    setAggs((prev) => {
      const map = new Map(prev.map((a) => [a.channel.id, a]));
      return orderedIds.map((id) => map.get(id)!).filter(Boolean);
    });
    // Persist new sort_order (multiples of 10)
    const updates = orderedIds.map((id, idx) =>
      supabase.from("marketing_channels").update({ sort_order: (idx + 1) * 10 }).eq("id", id)
    );
    const results = await Promise.all(updates);
    if (results.some((r) => r.error)) {
      toast({ title: "Не удалось сохранить порядок", variant: "destructive" });
      load();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <ResponsiveDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <ResponsiveDialogTrigger asChild>
            <Button size="sm" className="gap-2" onClick={() => setEditing(null)}>
              <Plus className="w-4 h-4" /> Добавить канал
            </Button>
          </ResponsiveDialogTrigger>
          <ResponsiveDialogContent className="max-w-md">
            <ResponsiveDialogHeader><ResponsiveDialogTitle>{editing ? "Редактировать канал" : "Новый канал"}</ResponsiveDialogTitle></ResponsiveDialogHeader>
            <ChannelForm initial={editing} onSaved={() => { setOpen(false); setEditing(null); load(); }} />
          </ResponsiveDialogContent>
        </ResponsiveDialog>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={load} disabled={loading} title="Обновить">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Обновить</span>
          </Button>
          <PeriodSelector date={range} onDateChange={setRange} />
        </div>
      </div>

      <ChannelsTable
        aggs={aggs}
        loading={loading}
        onEdit={(c) => { setEditing(c); setOpen(true); }}
        onDelete={handleDelete}
        onUtm={(c, linked) => setUtmDialog({ channel: c, linked })}
        onRevenue={(c) => setRevenueDialog({ channel: c })}
        onReorder={handleReorder}
      />

      <ResponsiveDialog open={!!revenueDialog} onOpenChange={(o) => !o && setRevenueDialog(null)}>
        <ResponsiveDialogContent className="max-w-md">
          <ResponsiveDialogHeader><ResponsiveDialogTitle>Ручной доход канала «{revenueDialog?.channel.name}»</ResponsiveDialogTitle></ResponsiveDialogHeader>
          {revenueDialog && (
            <RevenuesEditor channel={revenueDialog.channel} onChange={load} onClose={() => setRevenueDialog(null)} />
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ResponsiveDialog open={!!utmDialog} onOpenChange={(o) => !o && setUtmDialog(null)}>
        <ResponsiveDialogContent className="max-w-md">
          <ResponsiveDialogHeader><ResponsiveDialogTitle>UTM метки канала «{utmDialog?.channel.name}»</ResponsiveDialogTitle></ResponsiveDialogHeader>
          {utmDialog && (
            <UtmLinker
              channel={utmDialog.channel}
              allUtms={allUtms}
              initialLinked={utmDialog.linked.map((u) => u.id)}
              onSaved={() => { setUtmDialog(null); load(); }}
            />
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}

// ─── Channels table with drag-and-drop row ordering ──────────────────────

interface ColDef {
  key: string;
  label: string;
  short?: string;
  title?: string;
  align?: "left" | "right";
  render: (a: ChannelAgg) => React.ReactNode;
}

function ChannelsTable({
  aggs,
  loading,
  onEdit,
  onDelete,
  onUtm,
  onRevenue,
  onReorder,
}: {
  aggs: ChannelAgg[];
  loading: boolean;
  onEdit: (c: MarketingChannel) => void;
  onDelete: (id: string) => void;
  onUtm: (c: MarketingChannel, linked: UtmSource[]) => void;
  onRevenue: (c: MarketingChannel) => void;
  onReorder: (orderedIds: string[]) => void;
}) {
  const COLS: ColDef[] = useMemo(() => ([
    {
      key: "utms", label: "UTM метки", align: "left",
      render: (a) => (
        <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap">
          {a.linkedUtms.length === 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <>
              <Badge variant="secondary" className="text-[10px] font-normal whitespace-nowrap">{a.linkedUtms[0].name}</Badge>
              {a.linkedUtms.length > 1 && (
                <Badge variant="secondary" className="text-[10px] font-normal cursor-help whitespace-nowrap" title={a.linkedUtms.slice(1).map((u) => u.name).join(", ")}>
                  +{a.linkedUtms.length - 1}
                </Badge>
              )}
            </>
          )}
        </div>
      ),
    },
    { key: "cost", label: "Расход", align: "right", render: (a) => <span className="tabular-nums">{fmtRub(a.cost)}</span> },
    { key: "clicks", label: "Клики", align: "right", render: (a) => <span className="tabular-nums">{a.clicks.toLocaleString("ru-RU")}</span> },
    { key: "cpc", label: "CPC", title: "Cost per click", align: "right", render: (a) => <span className="tabular-nums">{a.cpc === null ? "—" : fmtRub(a.cpc)}</span> },
    { key: "regs", label: "Регистрации", short: "Рег.", align: "right", render: (a) => <span className="tabular-nums">{a.registrations.toLocaleString("ru-RU")}</span> },
    { key: "cpr", label: "CPR", title: "Стоимость регистрации", align: "right", render: (a) => <span className="tabular-nums">{a.cpr === null ? "—" : fmtRub(a.cpr)}</span> },
    { key: "orders", label: "Заказы", align: "right", render: (a) => <span className="tabular-nums">{a.orders.toLocaleString("ru-RU")}</span> },
    { key: "cpo", label: "CPO", title: "Стоимость заказа", align: "right", render: (a) => <span className="tabular-nums">{a.cpo === null ? "—" : fmtRub(a.cpo)}</span> },
    {
      key: "revenue", label: "Доход", align: "right",
      render: (a) => (
        <div className="tabular-nums">
          <div>{fmtRub(a.revenue)}</div>
          {a.utmRevenue > 0 && a.manualRevenue > 0 && (
            <div className="text-[10px] text-muted-foreground">UTM {fmtRub(a.utmRevenue)} + ручн. {fmtRub(a.manualRevenue)}</div>
          )}
        </div>
      ),
    },
    {
      key: "roi", label: "ROI", align: "right",
      render: (a) => (
        <span className={cn("font-semibold tabular-nums", a.roi === null ? "text-muted-foreground" : a.roi >= 0 ? "text-emerald-500" : "text-destructive")}>
          {a.roi === null ? "—" : `${a.roi.toFixed(1)}%`}
        </span>
      ),
    },
  ]), []);

  const utmsCol = COLS[0];
  const metricCols = COLS.slice(1);
  const colSpan = COLS.length + 3; // grip + channel + cols + actions

  const handleReorder = (items: { id: string }[]) => {
    onReorder(items.map((i) => i.id));
  };

  return (
    <Card className="bg-gradient-to-br from-card to-card/60 border-border/50 rounded-xl overflow-hidden shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Каналы маркетинга</CardTitle>
        <CardDescription className="mt-1">
          Расход, клики, CPC, доход и ROI по каналам ({aggs.length}). Перетащите строки за <span className="inline-flex align-middle"><GripVertical className="w-3 h-3" /></span> для своего порядка.
        </CardDescription>
      </CardHeader>

      {/* Desktop / tablet table */}
      <CardContent className="hidden md:block p-0 md:p-6 md:pt-0">
        <div className="overflow-x-auto rounded-lg border border-border/40">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/40">
                <TableHead className="w-8 px-1" />
                <TableHead className="text-xs font-semibold">Канал</TableHead>
                {COLS.map((c) => (
                  <TableHead
                    key={c.key}
                    title={c.title}
                    className={cn("text-xs font-semibold whitespace-nowrap", c.align === "right" && "text-right")}
                  >
                    {c.short ?? c.label}
                  </TableHead>
                ))}
                <TableHead className="w-[200px]"></TableHead>
              </TableRow>
            </TableHeader>
            {loading ? (
              <TableBody>
                <TableRow><TableCell colSpan={colSpan} className="text-center text-xs text-muted-foreground py-8">Загрузка…</TableCell></TableRow>
              </TableBody>
            ) : aggs.length === 0 ? (
              <TableBody>
                <TableRow><TableCell colSpan={colSpan} className="text-center text-xs text-muted-foreground py-10">Нет каналов</TableCell></TableRow>
              </TableBody>
            ) : (
              <SortableList items={aggs.map((a) => ({ id: a.channel.id }))} onReorder={handleReorder}>
                <TableBody>
                  {aggs.map((a, idx) => (
                    <SortableItem
                      key={a.channel.id}
                      id={a.channel.id}
                      asTableRow
                      className={cn("border-border/30 transition-colors hover:bg-muted/30", idx % 2 === 1 && "bg-muted/10")}
                    >
                      <TableCell className="text-xs font-medium whitespace-nowrap">{a.channel.name}</TableCell>
                      {COLS.map((c) => (
                        <TableCell key={c.key} className={cn("text-xs whitespace-nowrap", c.align === "right" && "text-right")}>
                          {c.render(a)}
                        </TableCell>
                      ))}
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => onUtm(a.channel, a.linkedUtms)}>
                            <Link2 className="w-3 h-3" /> UTM
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onRevenue(a.channel)}>Доход</Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(a.channel)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => onDelete(a.channel.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </SortableItem>
                  ))}
                </TableBody>
              </SortableList>
            )}
          </Table>
        </div>
      </CardContent>

      {/* Mobile cards (with drag handle) */}
      <CardContent className="md:hidden px-3 pb-4 pt-0">
        {loading ? (
          <div className="text-center text-xs text-muted-foreground py-8">Загрузка…</div>
        ) : aggs.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-10">Нет каналов</div>
        ) : (
          <SortableList items={aggs.map((a) => ({ id: a.channel.id }))} onReorder={handleReorder}>
            <div className="space-y-3">
              {aggs.map((a) => (
                <SortableItem key={a.channel.id} id={a.channel.id}>
                  <div className="rounded-lg border border-border/50 bg-card/80 p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{a.channel.name}</div>
                        <div className="mt-1">{utmsCol.render(a)}</div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(a.channel)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => onDelete(a.channel.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {metricCols.map((c) => (
                        <div key={c.key} className="rounded-md bg-muted/40 px-2.5 py-1.5">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{c.short ?? c.label}</div>
                          <div className="text-xs mt-0.5">{c.render(a)}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1 flex-1" onClick={() => onUtm(a.channel, a.linkedUtms)}>
                        <Link2 className="w-3 h-3" /> UTM
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs flex-1" onClick={() => onRevenue(a.channel)}>Доход</Button>
                    </div>
                  </div>
                </SortableItem>
              ))}
            </div>
          </SortableList>
        )}
      </CardContent>
    </Card>
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
