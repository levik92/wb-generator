import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, CreditCard, DollarSign, AlertCircle, Check, ChevronRight, Wallet, UserCheck, Copy, Mail, Phone, Landmark, Hash, Calendar, Banknote, Percent, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/dashboard/GlassCard";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
  const [searchQuery, setSearchQuery] = useState("");


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
    <Card className="bg-card border-border/50 rounded-2xl overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
        <div className="min-w-0">
          <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
            Активные партнеры
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {partners.length}
            </span>
          </CardTitle>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Email или код партнёра…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm bg-background"
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {(() => {
          const q = searchQuery.trim().toLowerCase();
          const visible = q
            ? partners.filter(p =>
                (p.user_email || "").toLowerCase().includes(q) ||
                (p.partner_code || "").toLowerCase().includes(q))
            : partners;

          if (visible.length === 0) {
            return (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {q ? "Ничего не найдено" : "Пока нет партнёров"}
              </div>
            );
          }

          const initial = (email?: string) => (email?.[0] || "?").toUpperCase();

          return isMobile ? (
            <div className="space-y-3">
              {visible.map(partner => (
                <motion.div
                  key={partner.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl border border-border/60 bg-card hover:border-primary/40 transition-colors cursor-pointer"
                  onClick={() => loadPartnerDetails(partner)}
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                        {initial(partner.user_email)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{partner.user_email || "—"}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {partner.partner_code}
                          </span>
                          <span className="text-[11px] text-muted-foreground">{partner.commission_rate}%</span>
                        </div>
                      </div>
                      {partner.has_pending_withdrawal ? (
                        <Badge variant="destructive" className="shrink-0 gap-1">
                          <AlertCircle className="h-3 w-3" />Запрос
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                          Активен
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Клиентов</p>
                        <p className="text-sm font-semibold tabular-nums">{partner.invited_clients_count}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Заработано</p>
                        <p className="text-sm font-semibold tabular-nums">{partner.total_earned.toLocaleString()} ₽</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Баланс</p>
                        <p className="text-sm font-semibold tabular-nums text-primary">{partner.current_balance.toLocaleString()} ₽</p>
                      </div>
                    </div>

                    {partner.has_pending_withdrawal && (
                      <div className="flex items-center justify-between rounded-lg bg-orange-500/10 border border-orange-500/20 px-3 py-2">
                        <span className="text-xs text-orange-700 dark:text-orange-400">Запрос на выплату</span>
                        <span className="text-sm font-semibold text-orange-700 dark:text-orange-400 tabular-nums">
                          {partner.pending_amount?.toLocaleString()} ₽
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/40">
                    <TableHead className="text-[11px] uppercase tracking-wider font-medium">Партнёр</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-medium">Код</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-medium text-center">Ставка</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-medium text-right">Клиентов</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-medium text-right">Заработано</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-medium text-right">Баланс</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-medium">Статус</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-medium text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map(partner => (
                    <TableRow
                      key={partner.id}
                      className="cursor-pointer hover:bg-muted/40 border-border/40 group"
                      onClick={() => loadPartnerDetails(partner)}
                    >
                      <TableCell className="font-medium py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                            {initial(partner.user_email)}
                          </div>
                          <span className="truncate max-w-[220px]">{partner.user_email || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          {partner.partner_code}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-sm tabular-nums">{partner.commission_rate}%</TableCell>
                      <TableCell className="text-right tabular-nums">{partner.invited_clients_count}</TableCell>
                      <TableCell className="text-right tabular-nums">{partner.total_earned.toLocaleString()} ₽</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-primary">
                        {partner.current_balance.toLocaleString()} ₽
                      </TableCell>
                      <TableCell>
                        {partner.has_pending_withdrawal ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {partner.pending_amount?.toLocaleString()} ₽
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                            Активен
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 opacity-70 group-hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); loadPartnerDetails(partner); }}
                        >
                          Детали
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          );
        })()}
      </CardContent>
    </Card>

    {/* Friends Management */}
    <AdminFriends />

    {/* Partner Details Dialog */}
    <ResponsiveDialog open={!!selectedPartner} onOpenChange={() => setSelectedPartner(null)}>
      <ResponsiveDialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto p-0">
        {/* Header */}
        <ResponsiveDialogHeader className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-base font-semibold text-primary shrink-0">
              {(selectedPartner?.user_email?.[0] || "?").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <ResponsiveDialogTitle className="text-base sm:text-lg flex items-center gap-2">
                <span className="truncate">{selectedPartner?.user_email || "—"}</span>
              </ResponsiveDialogTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <button
                  className="text-[11px] font-mono px-2 py-0.5 rounded bg-background/80 border border-border/60 text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                  onClick={() => {
                    if (selectedPartner?.partner_code) {
                      navigator.clipboard.writeText(selectedPartner.partner_code);
                      toast({ title: "Скопировано", description: selectedPartner.partner_code });
                    }
                  }}
                  title="Скопировать код"
                >
                  <Hash className="h-3 w-3" />{selectedPartner?.partner_code}
                  <Copy className="h-2.5 w-2.5" />
                </button>
                {selectedPartner?.has_pending_withdrawal ? (
                  <Badge variant="destructive" className="gap-1 text-[10px]">
                    <AlertCircle className="h-3 w-3" />Запрос {selectedPartner.pending_amount?.toLocaleString()} ₽
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    Активен
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </ResponsiveDialogHeader>

        {detailsLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 rounded-full border-[2.5px] border-primary/30 border-t-primary animate-[spin_0.7s_linear_infinite]" />
          </div>
        ) : (
          <div className="px-5 sm:px-6 py-5 space-y-5">
            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: UserCheck, label: "Клиентов", value: selectedPartner?.invited_clients_count ?? 0, tone: "text-foreground" },
                { icon: TrendingUp, label: "Заработано", value: `${(selectedPartner?.total_earned || 0).toLocaleString()} ₽`, tone: "text-emerald-600 dark:text-emerald-400" },
                { icon: Wallet, label: "Баланс", value: `${(selectedPartner?.current_balance || 0).toLocaleString()} ₽`, tone: "text-primary" },
              ].map((s, i) => (
                <div key={i} className="rounded-xl border border-border/60 bg-card p-3">
                  <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <s.icon className="h-3 w-3" />{s.label}
                  </div>
                  <p className={cn("text-lg sm:text-xl font-bold mt-1 tabular-nums", s.tone)}>{s.value}</p>
                </div>
              ))}
              <div className="rounded-xl border border-border/60 bg-card p-3">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <Percent className="h-3 w-3" />Ставка комиссии
                </div>
                <Select
                  value={String(selectedPartner?.commission_rate || 15)}
                  onValueChange={(val) => {
                    if (selectedPartner) handleChangeCommissionRate(selectedPartner.id, Number(val));
                  }}
                >
                  <SelectTrigger className="w-full h-9 mt-1 font-semibold">
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

            {/* Referrals */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Привлечённые клиенты
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {referrals.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {referrals.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Нет привлечённых клиентов</p>
                ) : (
                  <div className="space-y-3">
                    {referrals.slice((referralPage - 1) * REFERRALS_PER_PAGE, referralPage * REFERRALS_PER_PAGE).map(ref => {
                      const isPaid = ref.status === 'active';
                      return (
                        <div key={ref.id} className="rounded-xl border border-border/50 overflow-hidden bg-card">
                          <div className={cn(
                            "px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-border/40",
                            isPaid ? "bg-emerald-500/[0.04]" : "bg-muted/40"
                          )}>
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className={cn(
                                "h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0",
                                isPaid ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                              )}>
                                {(ref.email?.[0] || "?").toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{ref.email}</p>
                                {ref.full_name && <p className="text-[11px] text-muted-foreground truncate">{ref.full_name}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-[10px]",
                                  isPaid
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {isPaid ? 'Оплатил' : 'Зарегистрирован'}
                              </Badge>
                              <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(ref.registered_at).toLocaleDateString("ru-RU")}
                              </span>
                            </div>
                          </div>

                          <div className="px-3 sm:px-4 py-2 grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Всего оплат</p>
                              <p className="font-semibold tabular-nums">
                                {ref.total_payments > 0 ? `${Number(ref.total_payments).toLocaleString()} ₽` : '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Комиссия</p>
                              <p className="font-semibold tabular-nums text-primary">
                                {ref.total_commission > 0 ? `${Number(ref.total_commission).toLocaleString()} ₽` : '—'}
                              </p>
                            </div>
                          </div>

                          {ref.payments && ref.payments.length > 0 && (
                            isMobile ? (
                              <div className="border-t border-border/40 divide-y divide-border/30">
                                {ref.payments.map((p: any, idx: number) => (
                                  <div key={idx} className="px-3 py-2 flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium truncate">{p.package_name}</p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {new Date(p.date).toLocaleDateString("ru-RU")} · {p.commission_rate}%
                                      </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <p className="text-xs font-medium tabular-nums">{Number(p.payment_amount).toLocaleString()} ₽</p>
                                      <p className="text-[11px] font-semibold text-primary tabular-nums">+{Number(p.commission_amount).toLocaleString()} ₽</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="overflow-x-auto border-t border-border/40">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="hover:bg-transparent border-border/30">
                                      <TableHead className="text-[10px] uppercase tracking-wide h-8">Дата</TableHead>
                                      <TableHead className="text-[10px] uppercase tracking-wide h-8">Пакет</TableHead>
                                      <TableHead className="text-[10px] uppercase tracking-wide h-8 text-right">Сумма</TableHead>
                                      <TableHead className="text-[10px] uppercase tracking-wide h-8 text-center">Ставка</TableHead>
                                      <TableHead className="text-[10px] uppercase tracking-wide h-8 text-right">Комиссия</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {ref.payments.map((p: any, idx: number) => (
                                      <TableRow key={idx} className="border-border/30">
                                        <TableCell className="text-xs py-2">{new Date(p.date).toLocaleDateString("ru-RU")}</TableCell>
                                        <TableCell className="text-xs py-2">{p.package_name}</TableCell>
                                        <TableCell className="text-xs font-medium tabular-nums text-right py-2">{Number(p.payment_amount).toLocaleString()} ₽</TableCell>
                                        <TableCell className="text-xs text-center py-2">{p.commission_rate}%</TableCell>
                                        <TableCell className="text-xs font-semibold tabular-nums text-primary text-right py-2">+{Number(p.commission_amount).toLocaleString()} ₽</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )
                          )}
                        </div>
                      );
                    })}

                    {referrals.length > REFERRALS_PER_PAGE && (
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {(referralPage - 1) * REFERRALS_PER_PAGE + 1}–{Math.min(referralPage * REFERRALS_PER_PAGE, referrals.length)} из {referrals.length}
                        </span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" disabled={referralPage <= 1} onClick={() => setReferralPage(p => p - 1)}>Назад</Button>
                          <Button size="sm" variant="outline" disabled={referralPage >= Math.ceil(referrals.length / REFERRALS_PER_PAGE)} onClick={() => setReferralPage(p => p + 1)}>Далее</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bank Details + Manual Payment side-by-side on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {selectedPartner?.bank_details && (
                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-primary" />Банковские реквизиты
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5 pt-0">
                    {[
                      { icon: UserCheck, label: "ФИО", value: selectedPartner.bank_details.full_name, mono: false },
                      { icon: Phone, label: "Телефон", value: selectedPartner.bank_details.phone_number, mono: true },
                      { icon: Landmark, label: "Банк", value: selectedPartner.bank_details.bank_name, mono: false },
                      { icon: CreditCard, label: "Номер карты", value: selectedPartner.bank_details.card_number, mono: true, copy: true },
                    ].map((f, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                            <f.icon className="h-3 w-3" />{f.label}
                          </p>
                          <p className={cn("text-sm font-medium mt-0.5 break-all", f.mono && "font-mono")}>{f.value || "—"}</p>
                        </div>
                        {f.copy && f.value && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0"
                            onClick={() => {
                              navigator.clipboard.writeText(f.value);
                              toast({ title: "Скопировано" });
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card className={cn(
                "border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent",
                !selectedPartner?.bank_details && "lg:col-span-2"
              )}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-primary" />Ручная выплата
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="space-y-1.5">
                    <Label htmlFor="payment-amount" className="text-xs">Сумма выплаты (₽)</Label>
                    <Input
                      id="payment-amount"
                      type="number"
                      placeholder="Введите сумму"
                      value={manualPaymentAmount}
                      onChange={e => setManualPaymentAmount(e.target.value)}
                      min="0"
                      step="100"
                      className="tabular-nums bg-background"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[500, 1000, 2000, 5000].map(v => (
                      <Button
                        key={v}
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setManualPaymentAmount(String(v))}
                      >
                        {v.toLocaleString()} ₽
                      </Button>
                    ))}
                    {selectedPartner && selectedPartner.current_balance > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-primary/40 text-primary"
                        onClick={() => setManualPaymentAmount(String(selectedPartner.current_balance))}
                      >
                        Весь баланс
                      </Button>
                    )}
                  </div>
                  <Button className="w-full" onClick={handleManualPayment} disabled={!manualPaymentAmount || parseFloat(manualPaymentAmount) <= 0}>
                    <Check className="h-4 w-4 mr-2" />Подтвердить выплату
                  </Button>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    После подтверждения сумма будет записана как выплаченная и вычтена из баланса партнёра.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Withdrawals history */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />История выплат
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {withdrawals.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {withdrawals.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Выплат ещё не было</p>
                ) : isMobile ? (
                  <div className="space-y-2">
                    {withdrawals.map(w => (
                      <div key={w.id} className="rounded-xl border border-border/50 bg-card p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />{new Date(w.requested_at).toLocaleDateString("ru-RU")}
                          </div>
                          <Badge variant={w.status === "completed" ? "default" : w.status === "processing" ? "secondary" : "outline"} className={cn(
                            w.status === "completed" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          )}>
                            {w.status === "completed" ? "Выплачено" : w.status === "processing" ? "В обработке" : "Ожидает"}
                          </Badge>
                        </div>
                        <p className="text-lg font-bold tabular-nums">{Number(w.amount).toLocaleString()} ₽</p>
                        {w.status === "processing" && (
                          <Button size="sm" className="w-full" onClick={() => handleApproveWithdrawal(w.id)}>
                            <Check className="h-4 w-4 mr-2" />Подтвердить
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-border/40">
                          <TableHead className="text-[11px] uppercase tracking-wider">Дата запроса</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wider text-right">Сумма</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wider">Статус</TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wider text-right">Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {withdrawals.map(w => (
                          <TableRow key={w.id} className="border-border/40">
                            <TableCell className="text-sm">{new Date(w.requested_at).toLocaleDateString("ru-RU")}</TableCell>
                            <TableCell className="font-semibold tabular-nums text-right">{Number(w.amount).toLocaleString()} ₽</TableCell>
                            <TableCell>
                              <Badge variant={w.status === "completed" ? "default" : w.status === "processing" ? "secondary" : "outline"} className={cn(
                                w.status === "completed" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              )}>
                                {w.status === "completed" ? "Выплачено" : w.status === "processing" ? "В обработке" : "Ожидает"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {w.status === "processing" && (
                                <Button size="sm" onClick={() => handleApproveWithdrawal(w.id)}>
                                  <Check className="h-4 w-4 mr-2" />Подтвердить
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  </div>;
};
