import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, CreditCard, DollarSign, AlertCircle, Check } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface BankDetails {
  full_name: string;
  phone_number: string;
  bank_name: string;
  card_number: string;
}

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
  bank_details?: BankDetails;
}

export const AdminPartners = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<PartnerData[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<PartnerData | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [manualPaymentAmount, setManualPaymentAmount] = useState("");
  const [totalPaidOut, setTotalPaidOut] = useState(0);

  useEffect(() => {
    loadPartners();
    loadTotalPaidOut();
  }, []);

  const loadTotalPaidOut = async () => {
    try {
      const { data, error } = await supabase
        .from("partner_withdrawals")
        .select("amount")
        .eq("status", "completed");

      if (error) throw error;

      const total = data?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;
      setTotalPaidOut(total);
    } catch (error) {
      console.error("Error loading total paid out:", error);
    }
  };

  const loadPartners = async () => {
    try {
      setLoading(true);
      // Load partners with active status
      const { data: partnersData, error } = await supabase
        .from("partner_profiles")
        .select("*")
        .eq("status", "active")
        .order("total_earned", { ascending: false });

      if (error) throw error;

      // Check for pending withdrawals
      const { data: withdrawalsData } = await supabase
        .from("partner_withdrawals")
        .select("partner_id, amount, status")
        .in("status", ["pending", "processing"]);

      // Load profiles separately
      const userIds = partnersData?.map(p => p.user_id).filter(Boolean) || [];
      let profilesMap: Record<string, { email: string }> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", userIds);
        
        if (profilesData) {
          profilesMap = Object.fromEntries(
            profilesData.map(p => [p.id, { email: p.email }])
          );
        }
      }

      const partnersWithWithdrawals = partnersData?.map((p: any) => {
        const pendingWithdrawal = withdrawalsData?.find(w => w.partner_id === p.id);
        return {
          ...p,
          user_email: profilesMap[p.user_id]?.email,
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
    setManualPaymentAmount("");

    try {
      // Load withdrawals
      const { data: withdrawalsData } = await supabase
        .from("partner_withdrawals")
        .select("*")
        .eq("partner_id", partner.id)
        .order("requested_at", { ascending: false });

      // Load bank details
      const { data: bankData } = await supabase
        .from("partner_bank_details")
        .select("*")
        .eq("partner_id", partner.id)
        .maybeSingle();

      setWithdrawals(withdrawalsData || []);
      setSelectedPartner({
        ...partner,
        bank_details: bankData || undefined
      });
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
      await loadTotalPaidOut();
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

  const handleManualPayment = async () => {
    if (!selectedPartner || !manualPaymentAmount) {
      toast({
        title: "Ошибка",
        description: "Укажите сумму выплаты",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(manualPaymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Ошибка",
        description: "Некорректная сумма",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create manual withdrawal record
      const { error: insertError } = await supabase
        .from("partner_withdrawals")
        .insert({
          partner_id: selectedPartner.id,
          amount: amount,
          status: "completed",
          requested_at: new Date().toISOString(),
          processed_at: new Date().toISOString(),
          notes: "Ручная выплата администратором"
        });

      if (insertError) throw insertError;

      // Deduct from partner balance
      const { error: updateError } = await supabase
        .from("partner_profiles")
        .update({
          current_balance: selectedPartner.current_balance - amount
        })
        .eq("id", selectedPartner.id);

      if (updateError) throw updateError;

      toast({
        title: "Успешно",
        description: `Выплата ${amount.toLocaleString()} ₽ зафиксирована`
      });

      setManualPaymentAmount("");
      await loadPartners();
      await loadTotalPaidOut();
      if (selectedPartner) {
        await loadPartnerDetails(selectedPartner);
      }
    } catch (error: any) {
      console.error("Error processing manual payment:", error);
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.pendingWithdrawals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Выплачено партнерам
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPaidOut.toLocaleString()} ₽</div>
          </CardContent>
        </Card>
      </div>

      {/* Partners List */}
      <Card>
        <CardHeader>
          <CardTitle>Активные партнеры</CardTitle>
        </CardHeader>
        <CardContent>
          {isMobile ? (
            <div className="space-y-4">
              {partners.map((partner) => (
                <Card key={partner.id} className="bg-muted/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {partner.has_pending_withdrawal && (
                            <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />
                          )}
                          <p className="font-medium text-sm truncate">{partner.user_email || "—"}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">Код: {partner.partner_code}</p>
                      </div>
                      <Badge variant={partner.has_pending_withdrawal ? "destructive" : "default"} className="shrink-0">
                        {partner.has_pending_withdrawal ? "Запрос" : "Активен"}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Клиентов</p>
                        <p className="font-semibold">{partner.invited_clients_count}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Заработано</p>
                        <p className="font-semibold">{partner.total_earned.toLocaleString()} ₽</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Баланс</p>
                        <p className="font-semibold text-primary">{partner.current_balance.toLocaleString()} ₽</p>
                      </div>
                      {partner.has_pending_withdrawal && (
                        <div>
                          <p className="text-xs text-muted-foreground">К выплате</p>
                          <p className="font-semibold text-orange-600">{partner.pending_amount?.toLocaleString()} ₽</p>
                        </div>
                      )}
                    </div>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => loadPartnerDetails(partner)}
                    >
                      Подробнее
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
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
                          {partner.user_email || "—"}
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
          )}
        </CardContent>
      </Card>

      {/* Partner Details Dialog */}
      <Dialog open={!!selectedPartner} onOpenChange={() => setSelectedPartner(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              Партнер: {selectedPartner?.user_email || "—"}
            </DialogTitle>
          </DialogHeader>

          {detailsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Клиентов</p>
                  <p className="text-xl sm:text-2xl font-bold">{selectedPartner?.invited_clients_count}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Заработано</p>
                  <p className="text-xl sm:text-2xl font-bold">{selectedPartner?.total_earned.toLocaleString()} ₽</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Баланс</p>
                  <p className="text-xl sm:text-2xl font-bold">{selectedPartner?.current_balance.toLocaleString()} ₽</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Ставка</p>
                  <p className="text-xl sm:text-2xl font-bold">{selectedPartner?.commission_rate}%</p>
                </div>
              </div>

              {/* Bank Details */}
              {selectedPartner?.bank_details && (
                <Card className="bg-muted/30">
                  <CardHeader>
                    <CardTitle className="text-base">Банковские реквизиты</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">ФИО</p>
                        <p className="font-medium">{selectedPartner.bank_details.full_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Телефон</p>
                        <p className="font-medium">{selectedPartner.bank_details.phone_number}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Банк</p>
                        <p className="font-medium">{selectedPartner.bank_details.bank_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Номер карты</p>
                        <p className="font-medium font-mono">{selectedPartner.bank_details.card_number}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Manual Payment */}
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-base">Ручная выплата</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment-amount">Сумма выплаты (₽)</Label>
                    <Input
                      id="payment-amount"
                      type="number"
                      placeholder="Введите сумму"
                      value={manualPaymentAmount}
                      onChange={(e) => setManualPaymentAmount(e.target.value)}
                      min="0"
                      step="100"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleManualPayment}
                    disabled={!manualPaymentAmount || parseFloat(manualPaymentAmount) <= 0}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Подтвердить выплату
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    После подтверждения сумма будет записана как выплаченная и вычтена из баланса партнера
                  </p>
                </CardContent>
              </Card>

              {/* Withdrawals */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-4">История выплат</h3>
                {isMobile ? (
                  <div className="space-y-3">
                    {withdrawals.map((withdrawal) => (
                      <Card key={withdrawal.id} className="bg-muted/30">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs text-muted-foreground">Дата запроса</p>
                              <p className="text-sm font-medium">
                                {new Date(withdrawal.requested_at).toLocaleDateString("ru-RU")}
                              </p>
                            </div>
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
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Сумма</p>
                            <p className="text-lg font-bold">{withdrawal.amount.toLocaleString()} ₽</p>
                          </div>
                          {withdrawal.status === "processing" && (
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => handleApproveWithdrawal(withdrawal.id)}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Подтвердить
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
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
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
