import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Copy } from "lucide-react";
import { EXPENSE_CATEGORIES, ExpenseCategory, categoryLabel, fmtRub, toIsoDate, Expense, MarketingChannel } from "@/hooks/useFinanceData";
import { toast } from "@/hooks/use-toast";

export function ExpensesManager() {
  const [items, setItems] = useState<Expense[]>([]);
  const [channels, setChannels] = useState<MarketingChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const load = async () => {
    setLoading(true);
    const [{ data: ex }, { data: ch }] = await Promise.all([
      supabase.from("expenses").select("*").order("expense_date", { ascending: false }).limit(500),
      supabase.from("marketing_channels").select("*").eq("is_active", true).order("name"),
    ]);
    setItems((ex ?? []) as Expense[]);
    setChannels((ch ?? []) as MarketingChannel[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? items : items.filter((i) => i.category === filter);
  const total = filtered.reduce((s, i) => s + Number(i.amount), 0);

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить запись?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) {
      toast({ title: "Ошибка", description: "Не удалось удалить", variant: "destructive" });
      return;
    }
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[220px] h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground">
            Итого: <span className="font-semibold text-foreground">{fmtRub(total)}</span>
          </div>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" onClick={() => setEditing(null)}>
              <Plus className="w-4 h-4" /> Добавить расход
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editing?.id ? "Редактировать расход" : "Новый расход"}</DialogTitle></DialogHeader>
            <ExpenseForm
              key={editing?.id ?? `dup-${editing?.name ?? ''}-${editing?.expense_date ?? ''}-${editing?.channel_id ?? ''}-${open ? '1' : '0'}`}
              initial={editing}
              channels={channels}
              onSaved={() => { setOpen(false); setEditing(null); load(); }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card border-border/50 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Расходы</CardTitle>
          <CardDescription>Учёт операционных и маркетинговых расходов ({filtered.length})</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Дата</TableHead>
                  <TableHead className="text-xs">Название</TableHead>
                  <TableHead className="text-xs">Категория</TableHead>
                  <TableHead className="text-xs">Тег</TableHead>
                  <TableHead className="text-xs text-right">Сумма</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">Загрузка…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">Нет расходов</TableCell></TableRow>
                ) : filtered.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="text-xs whitespace-nowrap">{it.expense_date}</TableCell>
                    <TableCell className="text-xs font-medium max-w-[260px] truncate">{it.name}</TableCell>
                    <TableCell className="text-xs">{categoryLabel(it.category)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{it.tag || "—"}</TableCell>
                    <TableCell className="text-xs text-right font-medium whitespace-nowrap">{fmtRub(Number(it.amount))}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(it); setOpen(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Дублировать" onClick={() => { const { id, created_at, ...rest } = it as any; setEditing({ ...rest, expense_date: toIsoDate(new Date()) } as Expense); setOpen(true); }}>
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleDelete(it.id)}>
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
    </div>
  );
}

function ExpenseForm({
  initial, channels, onSaved,
}: {
  initial: Expense | null;
  channels: MarketingChannel[];
  onSaved: () => void;
}) {
  const [date, setDate] = useState(initial?.expense_date ?? toIsoDate(new Date()));
  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : "");
  const [category, setCategory] = useState<ExpenseCategory>(initial?.category ?? "cogs");
  const [tag, setTag] = useState(initial?.tag ?? "");
  const [channelId, setChannelId] = useState<string>(initial?.channel_id ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || !amount) {
      toast({ title: "Заполните название и сумму", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      expense_date: date,
      name: name.trim(),
      amount: Number(amount),
      category,
      tag: tag.trim() || null,
      channel_id: category === "marketing" && channelId ? channelId : null,
      notes: notes.trim() || null,
      created_by: user?.id ?? null,
    };
    const op = initial?.id
      ? supabase.from("expenses").update(payload).eq("id", initial.id)
      : supabase.from("expenses").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) {
      toast({ title: "Ошибка", description: "Не удалось сохранить", variant: "destructive" });
      return;
    }
    toast({ title: initial?.id ? "Обновлено" : "Добавлено" });
    onSaved();
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Дата</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Сумма, ₽</Label>
          <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
      </div>
      <div>
        <Label className="text-xs">Название</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: оплата OpenAI" />
      </div>
      <div>
        <Label className="text-xs">Категория</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {EXPENSE_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {category === "marketing" && (
        <div>
          <Label className="text-xs">Канал маркетинга</Label>
          <Select value={channelId || "none"} onValueChange={(v) => setChannelId(v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Без канала" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Без канала</SelectItem>
              {channels.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}{c.tag ? ` (${c.tag})` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div>
        <Label className="text-xs">Тег</Label>
        <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Произвольный тег" />
      </div>
      <div>
        <Label className="text-xs">Заметка</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>
      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? "Сохраняем…" : "Сохранить"}
      </Button>
    </div>
  );
}
