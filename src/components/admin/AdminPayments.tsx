import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Check, X, ChevronLeft, ChevronRight, CreditCard, FileText, Plus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

const ITEMS_PER_PAGE = 15;

export function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<InvoicePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [processingId, setProcessingId] = useState<string | null>(null);
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
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      succeeded: { label: "Успешно", variant: "default" },
      pending: { label: "В обработке", variant: "secondary" },
      canceled: { label: "Отменён", variant: "destructive" },
      expired: { label: "Истёк", variant: "outline" },
      failed: { label: "Ошибка", variant: "destructive" },
    };
    const info = map[status] || { label: status, variant: "secondary" as const };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  const getInvoiceStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      invoice_issued: { label: "Выставлен", variant: "outline" },
      awaiting_confirmation: { label: "Ожидает подтверждения", variant: "secondary" },
      paid: { label: "Оплачен", variant: "default" },
      rejected: { label: "Отклонён", variant: "destructive" },
    };
    const info = map[status] || { label: status, variant: "secondary" as const };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const paginatedPayments = payments.slice((paymentsPage - 1) * ITEMS_PER_PAGE, paymentsPage * ITEMS_PER_PAGE);
  const paginatedInvoices = invoices.slice((invoicesPage - 1) * ITEMS_PER_PAGE, invoicesPage * ITEMS_PER_PAGE);
  const totalPaymentPages = Math.ceil(payments.length / ITEMS_PER_PAGE);
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
          <Card className="bg-card border-border/50 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Все платежи</CardTitle>
              <CardDescription>Платежи от физических лиц через платёжные системы ({payments.length})</CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Email</TableHead>
                      <TableHead className="text-xs">Тариф</TableHead>
                      <TableHead className="text-xs">Сумма</TableHead>
                      <TableHead className="text-xs">Токены</TableHead>
                      <TableHead className="text-xs">Провайдер</TableHead>
                      <TableHead className="text-xs">Источник</TableHead>
                      <TableHead className="text-xs">Откуда узнали</TableHead>
                      <TableHead className="text-xs">Статус</TableHead>
                      <TableHead className="text-xs">Дата</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPayments.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs font-medium max-w-[200px] truncate">{p.user_email}</TableCell>
                        <TableCell className="text-xs">{p.package_name}</TableCell>
                        <TableCell className="text-xs">{p.amount}₽</TableCell>
                        <TableCell className="text-xs">{p.tokens_amount}</TableCell>
                        <TableCell className="text-xs capitalize">{p.payment_provider || 'yookassa'}</TableCell>
                        <TableCell className="text-xs max-w-[140px] truncate">
                          {p.utm_name ? <Badge variant="outline" className="text-[10px]">{p.utm_name}</Badge> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-xs max-w-[140px] truncate" title={p.acquisition || ''}>
                          {p.acquisition || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>{getStatusBadge(p.status)}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(p.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {totalPaymentPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <span className="text-xs text-muted-foreground">{(paymentsPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(paymentsPage * ITEMS_PER_PAGE, payments.length)} из {payments.length}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={paymentsPage === 1} onClick={() => setPaymentsPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm px-2">{paymentsPage} / {totalPaymentPages}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={paymentsPage >= totalPaymentPages} onClick={() => setPaymentsPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card className="bg-card border-border/50 rounded-2xl">
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-lg">Счета для юр. лиц</CardTitle>
                <CardDescription>Безналичные оплаты по выставленным счетам ({invoices.length})</CardDescription>
              </div>
              <Button size="sm" className="gap-2 shrink-0" onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4" />
                Создать счёт вручную
              </Button>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              {invoices.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 px-6">Счетов пока нет</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">№ счёта</TableHead>
                          <TableHead className="text-xs">Email</TableHead>
                          <TableHead className="text-xs">Организация</TableHead>
                          <TableHead className="text-xs">ИНН</TableHead>
                          <TableHead className="text-xs">Тариф</TableHead>
                          <TableHead className="text-xs">Сумма</TableHead>
                          <TableHead className="text-xs">Статус</TableHead>
                          <TableHead className="text-xs">Дата</TableHead>
                          <TableHead className="text-xs text-right">Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedInvoices.map(inv => (
                          <TableRow key={inv.id}>
                            <TableCell className="text-xs font-mono">
                              <div className="flex items-center gap-1.5">
                                {inv.invoice_number}
                                {inv.is_manual && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Ручной</Badge>}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs max-w-[150px] truncate">{inv.user_email}</TableCell>
                            <TableCell className="text-xs max-w-[150px] truncate">{inv.org_name}</TableCell>
                            <TableCell className="text-xs font-mono">{inv.org_inn}</TableCell>
                            <TableCell className="text-xs">{inv.package_name}</TableCell>
                            <TableCell className="text-xs">{inv.amount}₽</TableCell>
                            <TableCell>{getInvoiceStatusBadge(inv.status)}</TableCell>
                            <TableCell className="text-xs whitespace-nowrap">
                              {new Date(inv.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </TableCell>
                            <TableCell className="text-right">
                              {(inv.status === 'awaiting_confirmation' || inv.status === 'invoice_issued') && (
                                <div className="flex items-center justify-end gap-1">
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="sm" variant="default" className="h-7 w-7 p-0" disabled={processingId === inv.id}>
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
                                      <Button size="sm" variant="destructive" className="h-7 w-7 p-0" disabled={processingId === inv.id}>
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
                              {inv.status === 'paid' && <span className="text-xs text-muted-foreground">✓</span>}
                              {inv.status === 'rejected' && <span className="text-xs text-muted-foreground">✗</span>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {totalInvoicePages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <span className="text-xs text-muted-foreground">{(invoicesPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(invoicesPage * ITEMS_PER_PAGE, invoices.length)} из {invoices.length}</span>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8" disabled={invoicesPage === 1} onClick={() => setInvoicesPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                        <span className="text-sm px-2">{invoicesPage} / {totalInvoicePages}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8" disabled={invoicesPage >= totalInvoicePages} onClick={() => setInvoicesPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  )}
                </>
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
