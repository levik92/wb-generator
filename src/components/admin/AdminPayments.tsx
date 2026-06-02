import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Check, X, ChevronLeft, ChevronRight, CreditCard, FileText } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
}

const ITEMS_PER_PAGE = 15;

export function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<InvoicePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [processingId, setProcessingId] = useState<string | null>(null);

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
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;

      // Get user emails
      const userIds = [...new Set((data || []).map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);
      setPayments((data || []).map(p => ({ ...p, user_email: emailMap.get(p.user_id) || 'N/A' })));
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
            <CardHeader>
              <CardTitle className="text-lg">Счета для юр. лиц</CardTitle>
              <CardDescription>Безналичные оплаты по выставленным счетам ({invoices.length})</CardDescription>
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
                            <TableCell className="text-xs font-mono">{inv.invoice_number}</TableCell>
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
    </div>
  );
}
