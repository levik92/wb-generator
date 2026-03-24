import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, CreditCard, DollarSign, AlertCircle, Check } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/dashboard/GlassCard";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { AdminFriends } from "./AdminFriends";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BankDetails {
  full_name: string;
  phone_number: string;
  bank_name: string;
  card_number: string;
}

interface ReferralPayment {
  payment_id: string;
  payment_amount: number;
  commission_amount: number;
  commission_rate: number;
  date: string;
  package_name: string;
  status: string;
}

interface ReferralDetail {
  id: string;
  referred_user_id: string;
  email: string;
  full_name: string | null;
  status: string;
  total_payments: number;
  total_commission: number;
  registered_at: string;
  payments: ReferralPayment[];
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
  created_at?: string;
}

const COMMISSION_RATES = [15, 20, 25, 30];
const REFERRALS_PER_PAGE = 10;

export const AdminPartners = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<PartnerData[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<PartnerData | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<ReferralDetail[]>([]);
  const [referralPage, setReferralPage] = useState(1);
  const [manualPaymentAmount, setManualPaymentAmount] = useState("");
  const [totalPaidOut, setTotalPaidOut] = useState(0);

  useEffect(() => {
    loadPartners();
    loadTotalPaidOut();
  }, []);

  const loadTotalPaidOut = async () => {
    try {
      const { data, error } = await supabase.from("partner_withdrawals").select("amount").eq("status", "completed");
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
      const { data: partnersData, error } = await supabase
        .from("partner_profiles")
        .select("*")
        .eq("status", "active")
        .order("total_earned", { ascending: false });
      if (error) throw error;

      const { data: withdrawalsData } = await supabase
        .from("partner_withdrawals")
        .select("partner_id, amount, status")
        .in("status", ["pending", "processing"]);

      const userIds = partnersData?.map(p => p.user_id).filter(Boolean) || [];
      let profilesMap: Record<string, { email: string }> = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase.from("profiles").select("id, email").in("id", userIds);
        if (profilesData) {
          profilesMap = Object.fromEntries(profilesData.map(p => [p.id, { email: p.email }]));
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
      toast({ title: "Ошибка", description: "Не удалось загрузить данные партнеров", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadPartnerDetails = async (partner: PartnerData) => {
    setSelectedPartner(partner);
    setDetailsLoading(true);
    setManualPaymentAmount("");
    setReferrals([]);
    setReferralPage(1);
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

      // Load referrals with profile info via edge function
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-partner-referrals`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ partnerId: partner.id }),
          });
          if (res.ok) {
            const { referrals: refData, is_admin } = await res.json();
            // Deduplicate by referred_user_id — prefer record with higher commission, merge payments
            const uniqueMap = new Map<string, any>();
            (refData || []).forEach((r: any) => {
              const existing = uniqueMap.get(r.referred_user_id);
              if (!existing) {
                uniqueMap.set(r.referred_user_id, { ...r, payments: [...(r.payments || [])] });
              } else {
                // Merge payments arrays
                const mergedPayments = [...(existing.payments || []), ...(r.payments || [])];
                // Keep record with higher commission data
                if ((r.total_commission || 0) > (existing.total_commission || 0)) {
                  uniqueMap.set(r.referred_user_id, { ...r, payments: mergedPayments });
                } else {
                  existing.payments = mergedPayments;
                  existing.total_payments = Math.max(existing.total_payments || 0, r.total_payments || 0);
                  existing.total_commission = Math.max(existing.total_commission || 0, r.total_commission || 0);
                  if (r.status === 'active' && existing.status !== 'active') existing.status = r.status;
                }
              }
            });
            const deduped = Array.from(uniqueMap.values()).map((r: any) => ({
              id: r.id,
              referred_user_id: r.referred_user_id,
              email: (is_admin ? r.email : r.masked_email) || '—',
              full_name: r.full_name,
              status: r.status,
              total_payments: r.total_payments || 0,
              total_commission: r.total_commission || 0,
              registered_at: r.registered_at,
              payments: r.payments || [],
            }));
            setReferrals(deduped);
          }
        }
      } catch (e) {
        console.error("Error loading referrals:", e);
        // Fallback: load from partner_referrals directly
        const { data: refData } = await supabase
          .from("partner_referrals")
          .select("id, referred_user_id, status, total_payments, total_commission, registered_at")
          .eq("partner_id", partner.id)
          .order("registered_at", { ascending: false });
        
        if (refData) {
          // Deduplicate — prefer record with higher commission
          const uniqueMap = new Map<string, any>();
          refData.forEach((r: any) => {
            const existing = uniqueMap.get(r.referred_user_id);
            if (!existing || (r.total_commission || 0) > (existing.total_commission || 0)) {
              uniqueMap.set(r.referred_user_id, r);
            }
          });
          setReferrals(Array.from(uniqueMap.values()).map((r: any) => ({
            id: r.id,
            referred_user_id: r.referred_user_id,
            email: '—',
            full_name: null,
            status: r.status,
            total_payments: r.total_payments || 0,
            total_commission: r.total_commission || 0,
            registered_at: r.registered_at,
            payments: [],
          })));
        }
      }

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
        .update({ status: "completed", processed_at: new Date().toISOString() })
        .eq("id", withdrawalId);
      if (error) throw error;
      toast({ title: "Успешно", description: "Выплата подтверждена" });
      await loadPartners();
      await loadTotalPaidOut();
      if (selectedPartner) await loadPartnerDetails(selectedPartner);
    } catch (error: any) {
      console.error("Error approving withdrawal:", error);
      toast({ title: "Ошибка", description: "Не удалось обработать вывод средств", variant: "destructive" });
    }
  };

  const handleManualPayment = async () => {
    if (!selectedPartner || !manualPaymentAmount) {
      toast({ title: "Ошибка", description: "Укажите сумму выплаты", variant: "destructive" });
      return;
    }
    const amount = parseFloat(manualPaymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Ошибка", description: "Некорректная сумма", variant: "destructive" });
      return;
    }
    try {
      const { error: insertError } = await supabase.from("partner_withdrawals").insert({
        partner_id: selectedPartner.id,
        amount,
        status: "completed",
        requested_at: new Date().toISOString(),
        processed_at: new Date().toISOString(),
        notes: "Ручная выплата администратором"
      });
      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from("partner_profiles")
        .update({ current_balance: selectedPartner.current_balance - amount })
        .eq("id", selectedPartner.id);
      if (updateError) throw updateError;

      toast({ title: "Успешно", description: `Выплата ${amount.toLocaleString()} ₽ зафиксирована` });
      setManualPaymentAmount("");
      await loadPartners();
      await loadTotalPaidOut();
      if (selectedPartner) await loadPartnerDetails(selectedPartner);
    } catch (error: any) {
      console.error("Error processing manual payment:", error);
      toast({ title: "Ошибка", description: "Не удалось обработать выплату", variant: "destructive" });
    }
  };

  const handleChangeCommissionRate = async (partnerId: string, newRate: number) => {
    try {
      const { error } = await supabase
        .from("partner_profiles")
        .update({ commission_rate: newRate })
        .eq("id", partnerId);
      if (error) throw error;
      toast({ title: "Успешно", description: `Ставка изменена на ${newRate}%` });
      // Update local state
      setPartners(prev => prev.map(p => p.id === partnerId ? { ...p, commission_rate: newRate } : p));
      if (selectedPartner?.id === partnerId) {
        setSelectedPartner(prev => prev ? { ...prev, commission_rate: newRate } : null);
      }
    } catch (error) {
      console.error("Error updating commission rate:", error);
      toast({ title: "Ошибка", description: "Не удалось обновить ставку", variant: "destructive" });
    }
  };

  const totalStats = {
    totalPartners: partners.length,
    totalEarnings: partners.reduce((sum, p) => sum + p.total_earned, 0),
    totalClients: partners.reduce((sum, p) => sum + p.invited_clients_count, 0),
    pendingWithdrawals: partners.filter(p => p.has_pending_withdrawal).length
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12">
      <div className="w-7 h-7 rounded-full border-[2.5px] border-primary/30 border-t-primary animate-[spin_0.7s_linear_infinite]" />
    </div>;
  }

  return <div className="space-y-6">
    {/* Overall Stats */}
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
      <StatCard icon={<Users className="w-5 h-5" />} label="Всего партнеров" value={totalStats.totalPartners} delay={0} />
      <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Вознаграждения" value={`${totalStats.totalEarnings.toLocaleString()} ₽`} delay={0.05} />
      <StatCard icon={<CreditCard className="w-5 h-5" />} label="Привлечено клиентов" value={totalStats.totalClients} delay={0.1} />
      <StatCard icon={<AlertCircle className="w-5 h-5" />} label="Ожидают выплаты" value={totalStats.pendingWithdrawals} delay={0.15} />
      <StatCard icon={<DollarSign className="w-5 h-5" />} label="Выплачено" value={`${totalPaidOut.toLocaleString()} ₽`} delay={0.2} />
    </div>

    {/* Partners List */}
    <Card className="bg-card/80 backdrop-blur-xl border-border/50 rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Активные партнеры</CardTitle>
      </CardHeader>
      <CardContent>
        {isMobile ? <div className="space-y-4">
          {partners.map(partner => <Card key={partner.id} className="bg-muted/30">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {partner.has_pending_withdrawal && <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />}
                    <p className="font-medium text-sm truncate">{partner.user_email || "—"}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Код: {partner.partner_code} • Ставка: {partner.commission_rate}%</p>
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
                {partner.has_pending_withdrawal && <div>
                  <p className="text-xs text-muted-foreground">К выплате</p>
                  <p className="font-semibold text-orange-600">{partner.pending_amount?.toLocaleString()} ₽</p>
                </div>}
              </div>
              
              <Button size="sm" variant="outline" className="w-full" onClick={() => loadPartnerDetails(partner)}>
                Подробнее
              </Button>
            </CardContent>
          </Card>)}
        </div> : <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Код</TableHead>
                <TableHead>Ставка</TableHead>
                <TableHead>Клиентов</TableHead>
                <TableHead>Заработано</TableHead>
                <TableHead>Баланс</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.map(partner => <TableRow key={partner.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {partner.has_pending_withdrawal && <AlertCircle className="h-4 w-4 text-orange-500" />}
                    {partner.user_email || "—"}
                  </div>
                </TableCell>
                <TableCell>{partner.partner_code}</TableCell>
                <TableCell>{partner.commission_rate}%</TableCell>
                <TableCell>{partner.invited_clients_count}</TableCell>
                <TableCell>{partner.total_earned.toLocaleString()} ₽</TableCell>
                <TableCell className="font-semibold">{partner.current_balance.toLocaleString()} ₽</TableCell>
                <TableCell>
                  <Badge variant={partner.has_pending_withdrawal ? "destructive" : "default"}>
                    {partner.has_pending_withdrawal ? `Запрос ${partner.pending_amount?.toLocaleString()} ₽` : "Активен"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => loadPartnerDetails(partner)}>
                    Детали
                  </Button>
                </TableCell>
              </TableRow>)}
            </TableBody>
          </Table>
        </div>}
      </CardContent>
    </Card>

    {/* Friends Management */}
    <AdminFriends />

    {/* Partner Details Dialog */}
    <ResponsiveDialog open={!!selectedPartner} onOpenChange={() => setSelectedPartner(null)}>
      <ResponsiveDialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="text-base sm:text-lg">
            Партнер: {selectedPartner?.user_email || "—"}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        {detailsLoading ? <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div> : <div className="space-y-6">
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
              <p className="text-xs sm:text-sm text-muted-foreground">Ставка комиссии</p>
              <Select
                value={String(selectedPartner?.commission_rate || 15)}
                onValueChange={(val) => {
                  if (selectedPartner) {
                    handleChangeCommissionRate(selectedPartner.id, Number(val));
                  }
                }}
              >
                <SelectTrigger className="w-[100px] h-9 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMISSION_RATES.map(rate => (
                    <SelectItem key={rate} value={String(rate)}>{rate}%</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Referrals List */}
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-base">Привлечённые клиенты ({referrals.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {referrals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет привлечённых клиентов</p>
              ) : (
                <div className="space-y-4">
                  {referrals.slice((referralPage - 1) * REFERRALS_PER_PAGE, referralPage * REFERRALS_PER_PAGE).map(ref => (
                    <div key={ref.id} className="border border-border/50 rounded-xl overflow-hidden">
                      {/* Referral header */}
                      <div className="bg-muted/40 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-sm truncate">{ref.email}</span>
                          {ref.full_name && <span className="text-xs text-muted-foreground">({ref.full_name})</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={ref.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                            {ref.status === 'active' ? 'Оплатил' : 'Зарегистрирован'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(ref.registered_at).toLocaleDateString("ru-RU")}
                          </span>
                        </div>
                      </div>
                      {/* Referral summary */}
                      <div className="px-4 py-2 flex flex-wrap gap-4 text-sm border-b border-border/30">
                        <div>
                          <span className="text-muted-foreground">Всего оплат: </span>
                          <span className="font-semibold">{ref.total_payments > 0 ? `${Number(ref.total_payments).toLocaleString()} ₽` : '—'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Комиссия: </span>
                          <span className="font-semibold text-primary">{ref.total_commission > 0 ? `${Number(ref.total_commission).toLocaleString()} ₽` : '—'}</span>
                        </div>
                      </div>
                      {/* Per-payment breakdown */}
                      {ref.payments && ref.payments.length > 0 ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Дата</TableHead>
                                <TableHead className="text-xs">Пакет</TableHead>
                                <TableHead className="text-xs">Сумма оплаты</TableHead>
                                <TableHead className="text-xs">Ставка</TableHead>
                                <TableHead className="text-xs">Комиссия</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {ref.payments.map((p: any, idx: number) => (
                                <TableRow key={idx}>
                                  <TableCell className="text-xs">
                                    {new Date(p.date).toLocaleDateString("ru-RU")}
                                  </TableCell>
                                  <TableCell className="text-xs">{p.package_name}</TableCell>
                                  <TableCell className="text-xs font-medium">
                                    {Number(p.payment_amount).toLocaleString()} ₽
                                  </TableCell>
                                  <TableCell className="text-xs">{p.commission_rate}%</TableCell>
                                  <TableCell className="text-xs font-medium text-primary">
                                    {Number(p.commission_amount).toLocaleString()} ₽
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground px-4 py-2">Оплат пока нет</p>
                      )}
                    </div>
                  ))}
                  {/* Pagination */}
                  {referrals.length > REFERRALS_PER_PAGE && (
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-muted-foreground">
                        {(referralPage - 1) * REFERRALS_PER_PAGE + 1}–{Math.min(referralPage * REFERRALS_PER_PAGE, referrals.length)} из {referrals.length}
                      </span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={referralPage <= 1} onClick={() => setReferralPage(p => p - 1)}>
                          Назад
                        </Button>
                        <Button size="sm" variant="outline" disabled={referralPage >= Math.ceil(referrals.length / REFERRALS_PER_PAGE)} onClick={() => setReferralPage(p => p + 1)}>
                          Далее
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bank Details */}
          {selectedPartner?.bank_details && <Card className="bg-muted/30">
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
          </Card>}

          {/* Manual Payment */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-base">Ручная выплата</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Сумма выплаты (₽)</Label>
                <Input id="payment-amount" type="number" placeholder="Введите сумму" value={manualPaymentAmount} onChange={e => setManualPaymentAmount(e.target.value)} min="0" step="100" />
              </div>
              <Button className="w-full" onClick={handleManualPayment} disabled={!manualPaymentAmount || parseFloat(manualPaymentAmount) <= 0}>
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
            {isMobile ? <div className="space-y-3">
              {withdrawals.map(withdrawal => <Card key={withdrawal.id} className="bg-muted/30">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Дата запроса</p>
                      <p className="text-sm font-medium">
                        {new Date(withdrawal.requested_at).toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                    <Badge variant={withdrawal.status === "completed" ? "default" : withdrawal.status === "processing" ? "secondary" : "outline"}>
                      {withdrawal.status === "completed" ? "Выплачено" : withdrawal.status === "processing" ? "В обработке" : "Ожидает"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Сумма</p>
                    <p className="text-lg font-bold">{withdrawal.amount.toLocaleString()} ₽</p>
                  </div>
                  {withdrawal.status === "processing" && <Button size="sm" className="w-full" onClick={() => handleApproveWithdrawal(withdrawal.id)}>
                    <Check className="h-4 w-4 mr-2" />
                    Подтвердить
                  </Button>}
                </CardContent>
              </Card>)}
            </div> : <div className="overflow-x-auto">
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
                  {withdrawals.map(withdrawal => <TableRow key={withdrawal.id}>
                    <TableCell>
                      {new Date(withdrawal.requested_at).toLocaleDateString("ru-RU")}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {withdrawal.amount.toLocaleString()} ₽
                    </TableCell>
                    <TableCell>
                      <Badge variant={withdrawal.status === "completed" ? "default" : withdrawal.status === "processing" ? "secondary" : "outline"}>
                        {withdrawal.status === "completed" ? "Выплачено" : withdrawal.status === "processing" ? "В обработке" : "Ожидает"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {withdrawal.status === "processing" && <Button size="sm" onClick={() => handleApproveWithdrawal(withdrawal.id)}>
                        <Check className="h-4 w-4 mr-2" />
                        Подтвердить
                      </Button>}
                    </TableCell>
                  </TableRow>)}
                </TableBody>
              </Table>
            </div>}
          </div>
        </div>}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  </div>;
};
