import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, CreditCard, DollarSign, AlertCircle, Check } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface PartnerData {
  id: string;
  user_id: string;
  partner_code: string;
  status: string;
  commission_rate: number;
  total_earned: number;
  current_balance: number;
  invited_clients_count: number;
  has_pending_withdrawal: boolean;
  pending_amount?: number;
  user_email?: string;
}

export const AdminPartners = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<PartnerData[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<PartnerData | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      setLoading(true);
      // Load partners with active status
      const { data: partnersData, error } = await supabase
        .from("partner_profiles")
        .select(`
          *,
          profiles:user_id(email)
        `)
        .eq("status", "active")
        .order("total_earned", { ascending: false });

      if (error) throw error;

      // Check for pending withdrawals
      const { data: withdrawalsData } = await supabase
        .from("partner_withdrawals")
        .select("partner_id, amount, status")
        .in("status", ["pending", "processing"]);

      const partnersWithWithdrawals = partnersData?.map((p: any) => {
        const pendingWithdrawal = withdrawalsData?.find(w => w.partner_id === p.id);
        return {
          ...p,
          user_email: p.profiles?.email,
          has_pending_withdrawal: !!pendingWithdrawal,
          pending_amount: pendingWithdrawal?.amount
        };
      }) || [];

      setPartners(partnersWithWithdrawals);
    } catch (error) {
      console.error("Error loading partners:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные партнеров",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPartnerDetails = async (partner: PartnerData) => {
    setSelectedPartner(partner);
    setDetailsLoading(true);

    try {
      // Load withdrawals
      const { data: withdrawalsData } = await supabase
        .from("partner_withdrawals")
        .select("*")
        .eq("partner_id", partner.id)
        .order("requested_at", { ascending: false });

      setWithdrawals(withdrawalsData || []);
    } catch (error) {
      console.error("Error loading partner details:", error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleApproveWithdrawal = async (withdrawalId: string) => {
    try {
      const { error } = await supabase
        .from("partner_withdrawals")
        .update({
          status: "completed",
          processed_at: new Date().toISOString()
        })
        .eq("id", withdrawalId);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Выплата подтверждена"
      });

      await loadPartners();
      if (selectedPartner) {
        await loadPartnerDetails(selectedPartner);
      }
    } catch (error: any) {
      console.error("Error approving withdrawal:", error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const totalStats = {
    totalPartners: partners.length,
    totalEarnings: partners.reduce((sum, p) => sum + p.total_earned, 0),
    totalClients: partners.reduce((sum, p) => sum + p.invited_clients_count, 0),
    pendingWithdrawals: partners.filter(p => p.has_pending_withdrawal).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего партнеров
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalPartners}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Сумма вознаграждений
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalEarnings.toLocaleString()} ₽</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Привлечено клиентов
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalClients}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ожидают выплаты
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.pendingWithdrawals}</div>
          </CardContent>
        </Card>
      </div>

      {/* Partners List */}
      <Card>
        <CardHeader>
          <CardTitle>Активные партнеры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Код</TableHead>
                  <TableHead>Клиентов</TableHead>
                  <TableHead>Заработано</TableHead>
                  <TableHead>Баланс</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.map((partner) => (
                  <TableRow key={partner.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {partner.has_pending_withdrawal && (
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                        )}
                        {partner.user_email}
                      </div>
                    </TableCell>
                    <TableCell>{partner.partner_code}</TableCell>
                    <TableCell>{partner.invited_clients_count}</TableCell>
                    <TableCell>{partner.total_earned.toLocaleString()} ₽</TableCell>
                    <TableCell className="font-semibold">
                      {partner.current_balance.toLocaleString()} ₽
                    </TableCell>
                    <TableCell>
                      <Badge variant={partner.has_pending_withdrawal ? "destructive" : "default"}>
                        {partner.has_pending_withdrawal
                          ? `Запрос ${partner.pending_amount?.toLocaleString()} ₽`
                          : "Активен"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => loadPartnerDetails(partner)}
                      >
                        Детали
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Partner Details Dialog */}
      <Dialog open={!!selectedPartner} onOpenChange={() => setSelectedPartner(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Партнер: {selectedPartner?.user_email}
            </DialogTitle>
          </DialogHeader>

          {detailsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Клиентов</p>
                  <p className="text-2xl font-bold">{selectedPartner?.invited_clients_count}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Заработано</p>
                  <p className="text-2xl font-bold">{selectedPartner?.total_earned.toLocaleString()} ₽</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Баланс</p>
                  <p className="text-2xl font-bold">{selectedPartner?.current_balance.toLocaleString()} ₽</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ставка</p>
                  <p className="text-2xl font-bold">{selectedPartner?.commission_rate}%</p>
                </div>
              </div>

              {/* Withdrawals */}
              <div>
                <h3 className="text-lg font-semibold mb-4">История выплат</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата запроса</TableHead>
                      <TableHead>Сумма</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map((withdrawal) => (
                      <TableRow key={withdrawal.id}>
                        <TableCell>
                          {new Date(withdrawal.requested_at).toLocaleDateString("ru-RU")}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {withdrawal.amount.toLocaleString()} ₽
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              withdrawal.status === "completed"
                                ? "default"
                                : withdrawal.status === "processing"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {withdrawal.status === "completed"
                              ? "Выплачено"
                              : withdrawal.status === "processing"
                              ? "В обработке"
                              : "Ожидает"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {withdrawal.status === "processing" && (
                            <Button
                              size="sm"
                              onClick={() => handleApproveWithdrawal(withdrawal.id)}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Подтвердить
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
