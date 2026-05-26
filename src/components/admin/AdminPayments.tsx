import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Check, X, ChevronLeft, ChevronRight, CreditCard, FileText, Plus, Filter, Search, Calendar, Coins, Banknote, Building2, Hash } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface Payment {
  id: string;
  user_id: string;
  package_name: string;
  amount: number;
  tokens_amount: number;
  status: string;
  created_at: string;
  confirmed_at: string | null;
  payment_provider: string | null;
  user_email?: string;
  utm_name?: string;
  acquisition?: string;
}

interface InvoicePayment {
  id: string;
  user_id: string;
  package_name: string;
  amount: number;
  tokens_amount: number;
  status: string;
  invoice_number: string;
  invoice_date: string;
  admin_notes: string | null;
  created_at: string;
  user_email?: string;
  org_name?: string;
  org_inn?: string;
  is_manual?: boolean;
}

const ITEMS_PER_PAGE = 25;

export function AdminPayments() {
  const isMobile = useIsMobile();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<InvoicePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [utmFilter, setUtmFilter] = useState<string>("all");
  const [acqFilter, setAcqFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    email: "",
    package_name: "Ручное пополнение",
    amount: "",
    tokens: "",
    invoice_number: "",
    invoice_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const resetForm = () => setForm({
    email: "", package_name: "Ручное пополнение", amount: "", tokens: "",
    invoice_number: "", invoice_date: new Date().toISOString().slice(0, 10), notes: "",
  });

  const handleCreateManual = async () => {
    const amount = Number(form.amount);
    const tokens = Number(form.tokens);
    if (!form.email.trim() || !form.invoice_number.trim() || !(amount > 0) || !(tokens > 0)) {
      toast({ title: "Ошибка", description: "Заполните email, номер счёта, сумму и токены", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.rpc('admin_create_manual_invoice', {
        p_email: form.email.trim(),
        p_amount: amount,
        p_tokens: tokens,
        p_invoice_number: form.invoice_number.trim(),
        p_invoice_date: new Date(form.invoice_date).toISOString(),
        p_package_name: form.package_name,
        p_notes: form.notes || null,
      });
      if (error) throw error;
      toast({ title: "Счёт создан", description: "Счёт добавлен и ожидает подтверждения" });
      setCreateOpen(false);
      resetForm();
      await loadInvoices();
    } catch (e: any) {
      const msg = e?.message || "";
      const desc = msg.includes("not found") ? "Пользователь с таким email не найден" : "Не удалось создать счёт";
      toast({ title: "Ошибка", description: desc, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadPayments(), loadInvoices()]);
    setLoading(false);
  };

  const loadPayments = async () => {
    try {
      // Paginate ALL payments (bypass 1000-row Supabase limit)
      const PAGE = 1000;
      const all: any[] = [];
      for (let offset = 0; ; offset += PAGE) {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .order('created_at', { ascending: false })
          .range(offset, offset + PAGE - 1);
        if (error) throw error;
        const rows = data || [];
        all.push(...rows);
        if (rows.length < PAGE) break;
      }

      const userIds = [...new Set(all.map(p => p.user_id))];

      // Chunk .in() lookups to avoid URL length issues and per-request 1000 limits
      const CHUNK = 200;
      const profiles: { id: string; email: string; utm_source_id: string | null }[] = [];
      const surveys: { user_id: string; answer: string }[] = [];
      for (let i = 0; i < userIds.length; i += CHUNK) {
        const chunk = userIds.slice(i, i + CHUNK);
        const [pr, sr] = await Promise.all([
          supabase.from('profiles').select('id, email, utm_source_id').in('id', chunk),
          supabase.from('user_survey_responses').select('user_id, answer')
            .in('user_id', chunk).eq('question_key', 'acquisition_channel'),
        ]);
        profiles.push(...((pr.data || []) as any[]));
        surveys.push(...((sr.data || []) as any[]));
      }

      const utmIds = [...new Set(profiles.map(p => p.utm_source_id).filter(Boolean) as string[])];
      let utmMap = new Map<string, string>();
      if (utmIds.length > 0) {
        for (let i = 0; i < utmIds.length; i += CHUNK) {
          const chunk = utmIds.slice(i, i + CHUNK);
          const { data: utms } = await supabase.from('utm_sources').select('id, name').in('id', chunk);
          for (const u of (utms || []) as any[]) utmMap.set(u.id, u.name);
        }
      }

      const emailMap = new Map(profiles.map(p => [p.id, p.email]));
      const utmByUser = new Map(profiles.map(p => [p.id, p.utm_source_id ? utmMap.get(p.utm_source_id) || null : null]));
      const surveyMap = new Map<string, string>();
      for (const r of surveys) {
        if (!surveyMap.has(r.user_id)) {
          surveyMap.set(r.user_id, r.answer.startsWith('Другое:') ? r.answer.replace(/^Другое:\s*/, '') : r.answer);
        }
      }

      setPayments(all.map(p => ({
        ...p,
        user_email: emailMap.get(p.user_id) || 'N/A',
        utm_name: utmByUser.get(p.user_id) || undefined,
        acquisition: surveyMap.get(p.user_id) || undefined,
      })));
    } catch (error) {
      console.error('Error loading payments:', error);
    }
  };

  const loadInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoice_payments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((data || []).map(p => p.user_id))];
      const orgIds = [...new Set((data || []).map(p => p.organization_id))];

      const [profilesRes, orgsRes] = await Promise.all([
        supabase.from('profiles').select('id, email').in('id', userIds),
        supabase.from('organization_details').select('id, name, inn').in('id', orgIds),
      ]);

      const emailMap = new Map(profilesRes.data?.map(p => [p.id, p.email]) || []);
      const orgMap = new Map(orgsRes.data?.map(o => [o.id, { name: o.name, inn: o.inn }]) || []);

      setInvoices((data || []).map(inv => ({
        ...inv,
        user_email: emailMap.get(inv.user_id) || 'N/A',
        org_name: orgMap.get(inv.organization_id)?.name || '',
        org_inn: orgMap.get(inv.organization_id)?.inn || '',
      })));
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  };

  const handleInvoiceAction = async (invoiceId: string, action: 'approve' | 'reject') => {
    setProcessingId(invoiceId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.rpc('process_invoice_payment', {
        p_invoice_id: invoiceId,
        p_admin_id: session.user.id,
        p_action: action,
      });

      if (error) throw error;

      toast({
        title: action === 'approve' ? 'Счёт подтверждён' : 'Счёт отклонён',
        description: action === 'approve' ? 'Токены начислены пользователю' : 'Счёт отклонён',
      });

      await loadInvoices();
    } catch (error) {
      console.error('Error processing invoice:', error);
      toast({ title: "Ошибка", description: "Не удалось обработать счёт", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      succeeded: { label: "Успешно", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
      pending: { label: "В обработке", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
      canceled: { label: "Отменён", className: "bg-destructive/10 text-destructive border-destructive/20" },
      expired: { label: "Истёк", className: "bg-muted text-muted-foreground border-border" },
      failed: { label: "Ошибка", className: "bg-destructive/10 text-destructive border-destructive/20" },
    };
    const info = map[status] || { label: status, className: "bg-muted text-muted-foreground" };
    return <Badge variant="outline" className={cn("text-[10px] font-medium", info.className)}>{info.label}</Badge>;
  };

  const getInvoiceStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      invoice_issued: { label: "Выставлен", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
      awaiting_confirmation: { label: "Ожидает", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
      paid: { label: "Оплачен", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
      rejected: { label: "Отклонён", className: "bg-destructive/10 text-destructive border-destructive/20" },
    };
    const info = map[status] || { label: status, className: "bg-muted text-muted-foreground" };
    return <Badge variant="outline" className={cn("text-[10px] font-medium", info.className)}>{info.label}</Badge>;
  };

  const statusOptions = useMemo(() => Array.from(new Set(payments.map(p => p.status))).sort(), [payments]);
  const utmOptions = useMemo(() => Array.from(new Set(payments.map(p => p.utm_name).filter(Boolean) as string[])).sort(), [payments]);
  const acqOptions = useMemo(() => Array.from(new Set(payments.map(p => p.acquisition).filter(Boolean) as string[])).sort(), [payments]);

  const filteredPayments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return payments.filter(p => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (utmFilter !== "all") {
        if (utmFilter === "__none__") { if (p.utm_name) return false; }
        else if (p.utm_name !== utmFilter) return false;
      }
      if (acqFilter !== "all") {
        if (acqFilter === "__none__") { if (p.acquisition) return false; }
        else if (p.acquisition !== acqFilter) return false;
      }
      if (q && !(p.user_email || "").toLowerCase().includes(q) && !(p.package_name || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [payments, statusFilter, utmFilter, acqFilter, searchQuery]);

  const activeFiltersCount = (statusFilter !== "all" ? 1 : 0) + (utmFilter !== "all" ? 1 : 0) + (acqFilter !== "all" ? 1 : 0);

  useEffect(() => { setPaymentsPage(1); }, [statusFilter, utmFilter, acqFilter, searchQuery]);



  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-[2.5px] border-primary/30 border-t-primary animate-[spin_0.7s_linear_infinite]" />
      </div>
    );
  }

  const statusLabel = (s: string) => ({
    succeeded: "Успешно", pending: "В обработке", canceled: "Отменён", expired: "Истёк", failed: "Ошибка",
  } as Record<string, string>)[s] || s;

  const paginatedPayments = filteredPayments.slice((paymentsPage - 1) * ITEMS_PER_PAGE, paymentsPage * ITEMS_PER_PAGE);
  const paginatedInvoices = invoices.slice((invoicesPage - 1) * ITEMS_PER_PAGE, invoicesPage * ITEMS_PER_PAGE);
  const totalPaymentPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);
  const totalInvoicePages = Math.ceil(invoices.length / ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="payments" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Оплаты
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="w-4 h-4" />
            Оплата по счёту
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments">
          <Card className="bg-card border-border/50 rounded-2xl overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-lg flex items-center gap-2">
                      Все платежи
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {filteredPayments.length}
                      </span>
                    </CardTitle>
                    <CardDescription className="text-xs mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>Из {payments.length}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Сумма: {filteredPayments.filter(p => p.status === 'succeeded').reduce((s, p) => s + Number(p.amount), 0).toLocaleString()} ₽
                      </span>
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Email или тариф…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 text-sm bg-background"
                    />
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 gap-2 shrink-0">
                        <Filter className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Фильтры</span>
                        {activeFiltersCount > 0 && (
                          <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px]">{activeFiltersCount}</Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-[280px] p-3 space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Статус</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Все статусы</SelectItem>
                            {statusOptions.map(s => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Источник</Label>
                        <Select value={utmFilter} onValueChange={setUtmFilter}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Все источники</SelectItem>
                            <SelectItem value="__none__">Без источника</SelectItem>
                            {utmOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Откуда узнали</Label>
                        <Select value={acqFilter} onValueChange={setAcqFilter}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Любой ответ</SelectItem>
                            <SelectItem value="__none__">Не отвечал</SelectItem>
                            {acqOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {activeFiltersCount > 0 && (
                        <Button variant="ghost" size="sm" className="w-full h-8 text-xs" onClick={() => { setStatusFilter("all"); setUtmFilter("all"); setAcqFilter("all"); }}>
                          Сбросить фильтры
                        </Button>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              {paginatedPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-12 text-center">Ничего не найдено</p>
              ) : isMobile ? (
                <div className="space-y-2 px-3 pb-3">
                  {paginatedPayments.map(p => {
                    const initial = (p.user_email?.[0] || "?").toUpperCase();
                    const isSuccess = p.status === 'succeeded';
                    return (
                      <div key={p.id} className={cn(
                        "rounded-xl border border-border/60 bg-card p-3 space-y-2.5",
                        isSuccess && "border-emerald-500/20"
                      )}>
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            "h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
                            isSuccess ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                          )}>
                            {initial}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{p.user_email}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{p.package_name}</p>
                          </div>
                          {getStatusBadge(p.status)}
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40">
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Сумма</p>
                            <p className="text-sm font-semibold tabular-nums">{Number(p.amount).toLocaleString()} ₽</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Токены</p>
                            <p className="text-sm font-semibold tabular-nums text-primary">{p.tokens_amount}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Провайдер</p>
                            <p className="text-xs font-medium capitalize truncate">{p.payment_provider || 'yookassa'}</p>
                          </div>
                        </div>

                        {(p.utm_name || p.acquisition) && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {p.utm_name && <Badge variant="outline" className="text-[10px]">UTM: {p.utm_name}</Badge>}
                            {p.acquisition && <Badge variant="secondary" className="text-[10px] bg-muted">{p.acquisition}</Badge>}
                          </div>
                        )}

                        <div className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(p.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/40">
                        <TableHead className="text-[11px] uppercase tracking-wider font-medium">Пользователь</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-medium">Тариф</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-medium text-right">Сумма</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-medium text-right">Токены</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-medium">Провайдер</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-medium">Источник</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-medium">Откуда узнали</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-medium">Статус</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-medium">Дата</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPayments.map(p => {
                        const initial = (p.user_email?.[0] || "?").toUpperCase();
                        const isSuccess = p.status === 'succeeded';
                        return (
                          <TableRow key={p.id} className="border-border/40 hover:bg-muted/40">
                            <TableCell className="py-2.5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={cn(
                                  "h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0",
                                  isSuccess ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                                )}>
                                  {initial}
                                </div>
                                <span className="text-xs font-medium truncate max-w-[200px]">{p.user_email}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">{p.package_name}</TableCell>
                            <TableCell className="text-xs font-semibold tabular-nums text-right whitespace-nowrap">{Number(p.amount).toLocaleString()} ₽</TableCell>
                            <TableCell className="text-xs tabular-nums text-right text-primary font-medium">{p.tokens_amount}</TableCell>
                            <TableCell className="text-xs capitalize text-muted-foreground">{p.payment_provider || 'yookassa'}</TableCell>
                            <TableCell className="text-xs max-w-[140px] truncate">
                              {p.utm_name ? <Badge variant="outline" className="text-[10px]">{p.utm_name}</Badge> : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-xs max-w-[140px] truncate text-muted-foreground" title={p.acquisition || ''}>
                              {p.acquisition || '—'}
                            </TableCell>
                            <TableCell>{getStatusBadge(p.status)}</TableCell>
                            <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap tabular-nums">
                              {new Date(p.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
              {totalPaymentPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
                  <span className="text-xs text-muted-foreground tabular-nums">{(paymentsPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(paymentsPage * ITEMS_PER_PAGE, filteredPayments.length)} из {filteredPayments.length}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={paymentsPage === 1} onClick={() => setPaymentsPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm px-2 tabular-nums">{paymentsPage} / {totalPaymentPages}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={paymentsPage >= totalPaymentPages} onClick={() => setPaymentsPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card className="bg-card border-border/50 rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-4">
              <div className="min-w-0">
                <CardTitle className="text-lg flex items-center gap-2">
                  Счета для юр. лиц
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {invoices.length}
                  </span>
                </CardTitle>
                <CardDescription className="text-xs mt-1">Безналичные оплаты по выставленным счетам</CardDescription>
              </div>
              <Button size="sm" className="gap-2 shrink-0" onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Создать счёт вручную</span>
              </Button>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              {invoices.length === 0 ? (
                <p className="text-center text-muted-foreground py-12 px-6 text-sm">Счетов пока нет</p>
              ) : isMobile ? (
                <div className="space-y-2 px-3 pb-3">
                  {paginatedInvoices.map(inv => {
                    const isPaid = inv.status === 'paid';
                    const canAct = inv.status === 'awaiting_confirmation' || inv.status === 'invoice_issued';
                    return (
                      <div key={inv.id} className={cn(
                        "rounded-xl border border-border/60 bg-card p-3 space-y-2.5",
                        isPaid && "border-emerald-500/20"
                      )}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">#{inv.invoice_number}</span>
                              {inv.is_manual && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Ручной</Badge>}
                            </div>
                            <p className="text-sm font-medium truncate mt-1">{inv.org_name || inv.user_email}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{inv.user_email}</p>
                          </div>
                          {getInvoiceStatusBadge(inv.status)}
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">ИНН</p>
                            <p className="text-xs font-mono">{inv.org_inn || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Тариф</p>
                            <p className="text-xs truncate">{inv.package_name}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Сумма</p>
                            <p className="text-sm font-semibold tabular-nums">{Number(inv.amount).toLocaleString()} ₽</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Токены</p>
                            <p className="text-sm font-semibold tabular-nums text-primary">{inv.tokens_amount}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <div className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(inv.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                          {canAct && (
                            <div className="flex gap-1.5">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="default" className="h-8 px-3 gap-1" disabled={processingId === inv.id}>
                                    <Check className="w-3.5 h-3.5" />Принять
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Подтвердить оплату?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Будет начислено {inv.tokens_amount} токенов пользователю {inv.user_email}. Счёт #{inv.invoice_number} на сумму {inv.amount}₽.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleInvoiceAction(inv.id, 'approve')}>Подтвердить</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-destructive border-destructive/30 hover:bg-destructive/10" disabled={processingId === inv.id}>
                                    <X className="w-3.5 h-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Отклонить счёт?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Счёт #{inv.invoice_number} будет отклонён. Токены не будут начислены.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleInvoiceAction(inv.id, 'reject')} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Отклонить</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/40">
                        <TableHead className="text-[11px] uppercase tracking-wider font-medium">№ счёта</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-medium">Email</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-medium">Организация</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-medium">ИНН</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-medium">Тариф</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-medium text-right">Сумма</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-medium">Статус</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-medium">Дата</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-medium text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedInvoices.map(inv => (
                        <TableRow key={inv.id} className="border-border/40 hover:bg-muted/40">
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">#{inv.invoice_number}</span>
                              {inv.is_manual && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Ручной</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs max-w-[150px] truncate">{inv.user_email}</TableCell>
                          <TableCell className="text-xs max-w-[180px]">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className="truncate">{inv.org_name || '—'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{inv.org_inn || '—'}</TableCell>
                          <TableCell className="text-xs">{inv.package_name}</TableCell>
                          <TableCell className="text-xs font-semibold tabular-nums text-right whitespace-nowrap">{Number(inv.amount).toLocaleString()} ₽</TableCell>
                          <TableCell>{getInvoiceStatusBadge(inv.status)}</TableCell>
                          <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap tabular-nums">
                            {new Date(inv.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </TableCell>
                          <TableCell className="text-right">
                            {(inv.status === 'awaiting_confirmation' || inv.status === 'invoice_issued') ? (
                              <div className="flex items-center justify-end gap-1">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="default" className="h-7 w-7 p-0" disabled={processingId === inv.id} title="Подтвердить">
                                      <Check className="w-3.5 h-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Подтвердить оплату?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Будет начислено {inv.tokens_amount} токенов пользователю {inv.user_email}. Счёт #{inv.invoice_number} на сумму {inv.amount}₽.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleInvoiceAction(inv.id, 'approve')}>Подтвердить</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-destructive border-destructive/30 hover:bg-destructive/10" disabled={processingId === inv.id} title="Отклонить">
                                      <X className="w-3.5 h-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Отклонить счёт?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Счёт #{inv.invoice_number} будет отклонён. Токены не будут начислены.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleInvoiceAction(inv.id, 'reject')} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Отклонить</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {totalInvoicePages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
                  <span className="text-xs text-muted-foreground tabular-nums">{(invoicesPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(invoicesPage * ITEMS_PER_PAGE, invoices.length)} из {invoices.length}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={invoicesPage === 1} onClick={() => setInvoicesPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm px-2 tabular-nums">{invoicesPage} / {totalInvoicePages}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={invoicesPage >= totalInvoicePages} onClick={() => setInvoicesPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Создать счёт вручную</DialogTitle>
            <DialogDescription>
              Создайте счёт-заявку для пользователя. После подтверждения токены будут начислены и операция отразится в истории и общей аналитике.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Email пользователя *</Label>
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Назначение / название тарифа</Label>
              <Input value={form.package_name} onChange={e => setForm(f => ({ ...f, package_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Сумма, ₽ *</Label>
                <Input type="number" min="1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Токены *</Label>
                <Input type="number" min="1" value={form.tokens} onChange={e => setForm(f => ({ ...f, tokens: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Номер счёта *</Label>
                <Input value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} placeholder="2026-0001" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Дата счёта</Label>
                <Input type="date" value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Примечание (для админа)</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Отмена</Button>
            <Button onClick={handleCreateManual} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Создать счёт"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
