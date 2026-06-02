import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Receipt,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  RotateCcw,
  CreditCard,
  Coins,
} from "lucide-react";

interface Payment {
  id: string;
  package_name: string;
  amount: number;
  tokens_amount: number;
  status: string;
  created_at: string;
  confirmed_at: string | null;
  type: 'payment' | 'invoice';
  invoice_number?: string;
}

const ITEMS_PER_PAGE = 10;

type StatusKind = 'success' | 'pending' | 'danger' | 'neutral';

const statusMeta = (payment: Payment): { label: string; kind: StatusKind; Icon: typeof CheckCircle2 } => {
  if (payment.type === 'invoice') {
    switch (payment.status) {
      case 'invoice_issued': return { label: 'Выставлен', kind: 'neutral', Icon: FileText };
      case 'awaiting_confirmation': return { label: 'На проверке', kind: 'pending', Icon: Clock };
      case 'paid': return { label: 'Начислено', kind: 'success', Icon: CheckCircle2 };
      case 'rejected': return { label: 'Отклонён', kind: 'danger', Icon: XCircle };
      default: return { label: payment.status, kind: 'neutral', Icon: AlertCircle };
    }
  }
  switch (payment.status) {
    case 'succeeded': return { label: 'Успешно', kind: 'success', Icon: CheckCircle2 };
    case 'pending': return { label: 'В обработке', kind: 'pending', Icon: Clock };
    case 'waiting_for_capture': return { label: 'Ожидает списания', kind: 'pending', Icon: Clock };
    case 'canceled':
    case 'cancelled': return { label: 'Отменён', kind: 'danger', Icon: XCircle };
    case 'expired': return { label: 'Истёк', kind: 'danger', Icon: AlertCircle };
    case 'failed': return { label: 'Ошибка', kind: 'danger', Icon: XCircle };
    case 'refunded': return { label: 'Возвращён', kind: 'neutral', Icon: RotateCcw };
    default: return { label: payment.status, kind: 'neutral', Icon: AlertCircle };
  }
};

const kindClasses: Record<StatusKind, { chip: string; bar: string; text: string }> = {
  success: {
    chip: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    bar: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  pending: {
    chip: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    bar: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
  },
  danger: {
    chip: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
    bar: 'bg-red-500',
    text: 'text-red-600 dark:text-red-400',
  },
  neutral: {
    chip: 'bg-muted text-muted-foreground border-border/60',
    bar: 'bg-muted-foreground/40',
    text: 'text-muted-foreground',
  },
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatAmount = (n: number) => new Intl.NumberFormat('ru-RU').format(n);

export default function PaymentHistory() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [paymentsRes, invoicesRes] = await Promise.all([
        supabase.from('payments').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
        supabase.from('invoice_payments').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      ]);

      const regularPayments: Payment[] = (paymentsRes.data || []).map(p => ({
        id: p.id,
        package_name: p.package_name,
        amount: p.amount,
        tokens_amount: p.tokens_amount,
        status: p.status,
        created_at: p.created_at,
        confirmed_at: p.confirmed_at,
        type: 'payment' as const,
      }));

      const invoicePayments: Payment[] = (invoicesRes.data || []).map(p => ({
        id: p.id,
        package_name: p.package_name,
        amount: Number(p.amount),
        tokens_amount: p.tokens_amount,
        status: p.status,
        created_at: p.created_at,
        confirmed_at: p.reviewed_at,
        type: 'invoice' as const,
        invoice_number: p.invoice_number,
      }));

      const all = [...regularPayments, ...invoicePayments].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setPayments(all);
    } catch (error) {
      console.error('Error loading payments:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить историю платежей",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openInvoice = (invoiceNumber: string) => {
    window.open(`/invoice/${invoiceNumber}`, '_blank');
  };

  const totalPages = Math.max(1, Math.ceil(payments.length / ITEMS_PER_PAGE));
  const pageStart = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = payments.slice(pageStart, pageStart + ITEMS_PER_PAGE);

  return (
    <Card className="w-full overflow-hidden rounded-2xl border-border/60">
      <CardHeader className="px-4 sm:px-6 pt-5 pb-4 border-b border-border/60">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="shrink-0 w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-violet-600 dark:text-violet-300" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg leading-tight">История пополнений</CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">
                Все ваши пополнения баланса токенов
              </CardDescription>
            </div>
          </div>
          {!loading && payments.length > 0 && (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground tabular-nums">
              {payments.length}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="p-4 sm:p-6 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-14 px-6">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
              <Receipt className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="font-medium text-sm">Здесь пока пусто</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              После первого пополнения операции появятся в этом списке
            </p>
          </div>
        ) : (
          <>
            {/* Mobile / Tablet — card list */}
            <ul className="md:hidden divide-y divide-border/50">
              {pageItems.map((payment) => {
                const meta = statusMeta(payment);
                const c = kindClasses[meta.kind];
                return (
                  <li key={payment.id} className="relative px-4 py-3.5">
                    <span aria-hidden className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full ${c.bar}`} />
                    <div className="flex items-start justify-between gap-3 pl-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 font-medium text-sm leading-tight">
                          {payment.type === 'invoice' && <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                          <span className="truncate">{payment.package_name}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {formatDate(payment.created_at)}
                        </div>
                      </div>
                      <span className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${c.chip}`}>
                        <meta.Icon className="w-3 h-3" />
                        {meta.label}
                      </span>
                    </div>

                    <div className="mt-3 pl-2 flex items-center justify-between gap-3">
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-semibold tabular-nums">{formatAmount(payment.amount)}</span>
                        <span className="text-xs text-muted-foreground">₽</span>
                      </div>
                      <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Coins className="w-3.5 h-3.5 text-violet-500/80" />
                        <span className="font-medium text-foreground tabular-nums">{formatAmount(payment.tokens_amount)}</span>
                        <span>токенов</span>
                      </div>
                    </div>

                    {payment.type === 'invoice' && payment.invoice_number && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 ml-2 h-8 gap-1.5 text-xs"
                        onClick={() => openInvoice(payment.invoice_number!)}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Счёт {payment.invoice_number}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Desktop — table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">Тариф</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80 text-right">Сумма</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80 text-right">Токены</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">Статус</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">Дата</TableHead>
                    <TableHead className="w-[1%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((payment) => {
                    const meta = statusMeta(payment);
                    const c = kindClasses[meta.kind];
                    return (
                      <TableRow key={payment.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <span className={`w-1.5 h-1.5 rounded-full ${c.bar}`} />
                            {payment.type === 'invoice' && <FileText className="w-3.5 h-3.5 text-muted-foreground" />}
                            <span className="truncate">{payment.package_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-right tabular-nums font-medium">
                          {formatAmount(payment.amount)}<span className="text-muted-foreground ml-0.5">₽</span>
                        </TableCell>
                        <TableCell className="py-3 text-right tabular-nums">
                          {formatAmount(payment.tokens_amount)}
                        </TableCell>
                        <TableCell className="py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${c.chip}`}>
                            <meta.Icon className="w-3 h-3" />
                            {meta.label}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(payment.created_at)}
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          {payment.type === 'invoice' && payment.invoice_number ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-500/10"
                              onClick={() => openInvoice(payment.invoice_number!)}
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Счёт
                            </Button>
                          ) : (
                            <CreditCard className="w-4 h-4 text-muted-foreground/50 ml-auto" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {payments.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-border/60 bg-muted/20">
                <span className="text-[11px] sm:text-xs text-muted-foreground tabular-nums">
                  {pageStart + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, payments.length)} из {payments.length}
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs sm:text-sm px-2 tabular-nums text-muted-foreground">
                    {currentPage} <span className="text-muted-foreground/60">/</span> {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
