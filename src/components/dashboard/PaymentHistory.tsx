import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";

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
        supabase
          .from('payments')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('invoice_payments')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false }),
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

  const getStatusBadge = (payment: Payment) => {
    if (payment.type === 'invoice') {
      switch (payment.status) {
        case 'invoice_issued':
          return <Badge variant="secondary">Выставлен</Badge>;
        case 'awaiting_confirmation':
          return <Badge variant="outline">На проверке</Badge>;
        case 'paid':
          return <Badge variant="default">Начислено</Badge>;
        case 'rejected':
          return <Badge variant="destructive">Отклонён</Badge>;
        default:
          return <Badge variant="secondary">{payment.status}</Badge>;
      }
    }
    switch (payment.status) {
      case 'succeeded':
        return <Badge variant="default">Успешно</Badge>;
      case 'pending':
        return <Badge variant="secondary">В обработке</Badge>;
      case 'canceled':
        return <Badge variant="destructive">Отменен</Badge>;
      default:
        return <Badge variant="secondary">{payment.status}</Badge>;
    }
  };

  const openInvoice = (invoiceNumber: string) => {
    window.open(`/invoice/${invoiceNumber}`, '_blank');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>История пополнений</CardTitle>
          <CardDescription>Загрузка...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader>
        <CardTitle>История пополнений</CardTitle>
        <CardDescription>
          Все ваши пополнения баланса токенов
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 sm:p-6">
        {payments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 px-6">
            У вас пока нет пополнений
          </p>
        ) : (
          <>
            {/* Mobile and Tablet Card Layout */}
            <div className="block lg:hidden space-y-3 p-4">
              {payments.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((payment) => (
                <div key={payment.id} className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="font-medium text-sm flex items-center gap-1.5">
                        {payment.type === 'invoice' && <FileText className="w-3.5 h-3.5 text-muted-foreground" />}
                        {payment.package_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(payment.created_at).toLocaleDateString('ru-RU', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    {getStatusBadge(payment)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground text-xs">Сумма</div>
                      <div className="font-medium">{payment.amount}₽</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Токены</div>
                      <div className="font-medium">{payment.tokens_amount}</div>
                    </div>
                  </div>

                  {payment.type === 'invoice' && payment.invoice_number && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 text-xs"
                      onClick={() => openInvoice(payment.invoice_number!)}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Счёт {payment.invoice_number}
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden lg:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Тариф</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Токены</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-1.5">
                          {payment.type === 'invoice' && <FileText className="w-3.5 h-3.5 text-muted-foreground" />}
                          {payment.package_name}
                        </span>
                      </TableCell>
                      <TableCell>{payment.amount}₽</TableCell>
                      <TableCell>{payment.tokens_amount}</TableCell>
                      <TableCell>{getStatusBadge(payment)}</TableCell>
                      <TableCell>
                        {new Date(payment.created_at).toLocaleDateString('ru-RU', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>
                        {payment.type === 'invoice' && payment.invoice_number && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() => openInvoice(payment.invoice_number!)}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Счёт
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {payments.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <span className="text-xs text-muted-foreground">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, payments.length)} из {payments.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm px-2">{currentPage} / {Math.ceil(payments.length / ITEMS_PER_PAGE)}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage >= Math.ceil(payments.length / ITEMS_PER_PAGE)}
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
