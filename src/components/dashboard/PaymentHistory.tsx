import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface Payment {
  id: string;
  package_name: string;
  amount: number;
  tokens_amount: number;
  status: string;
  created_at: string;
  confirmed_at: string | null;
}

export default function PaymentHistory() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading payments:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить историю платежей",
          variant: "destructive",
        });
      } else {
        setPayments(data || []);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <Badge variant="default">Успешно</Badge>;
      case 'pending':
        return <Badge variant="secondary">В обработке</Badge>;
      case 'canceled':
        return <Badge variant="destructive">Отменен</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
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
              {payments.map((payment) => (
                <div key={payment.id} className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{payment.package_name}</div>
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
                    {getStatusBadge(payment.status)}
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.package_name}
                      </TableCell>
                      <TableCell>{payment.amount}₽</TableCell>
                      <TableCell>{payment.tokens_amount}</TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>
                        {new Date(payment.created_at).toLocaleDateString('ru-RU', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}