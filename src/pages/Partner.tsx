import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, LogOut, Copy, CreditCard, TrendingUp, Users, AlertCircle, Link2, Handshake, Wallet, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BankDetailsForm } from "@/components/partner/BankDetailsForm";
import { WithdrawalButton } from "@/components/partner/WithdrawalButton";
import Footer from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StatCard } from "@/components/dashboard/GlassCard";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { User as UserIcon } from "lucide-react";

interface PartnerProfile {
  id: string;
  partner_code: string;
  status: string;
  commission_rate: number;
  total_earned: number;
  current_balance: number;
  invited_clients_count: number;
}
interface PartnerReferral {
  id: string;
  referred_user_id: string;
  registered_at: string;
  first_payment_at: string | null;
  total_payments: number;
  total_commission: number;
  status: string;
  masked_email?: string;
  full_name?: string | null;
  profiles?: {
    email: string;
    full_name: string | null;
  };
}
interface PartnerCommission {
  id: string;
  commission_amount: number;
  payment_amount: number;
  created_at: string;
  status: string;
}
interface PartnerWithdrawal {
  id: string;
  amount: number;
  status: string;
  requested_at: string;
  processed_at: string | null;
  payment_method: string | null;
  notes: string | null;
}

const Partner = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [referrals, setReferrals] = useState<PartnerReferral[]>([]);
  const [commissions, setCommissions] = useState<PartnerCommission[]>([]);
  const [withdrawals, setWithdrawals] = useState<PartnerWithdrawal[]>([]);
  const [hasBankDetails, setHasBankDetails] = useState(false);
  const [earningsDateRange, setEarningsDateRange] = useState("7");
  const [clientsDateRange, setClientsDateRange] = useState("7");
  const [activeTab, setActiveTab] = useState("clients");

  useEffect(() => {
    loadPartnerData();
  }, []);

  const loadPartnerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: partnerData, error: partnerError } = await supabase
        .from("partner_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (partnerError && partnerError.code !== "PGRST116") {
        throw partnerError;
      }

      if (!partnerData) {
        const { data: codeData } = await supabase.rpc("generate_partner_code");
        const { data: newPartner, error: createError } = await supabase
          .from("partner_profiles")
          .insert({
            user_id: user.id,
            partner_code: codeData,
            status: "inactive"
          })
          .select()
          .single();
        if (createError) throw createError;
        setPartner(newPartner);
      } else {
        setPartner(partnerData);

        const { data: referralsData, error: referralsError } = await supabase
          .from("partner_referrals")
          .select("*")
          .eq("partner_id", partnerData.id)
          .order("registered_at", { ascending: false });

        if (referralsError) {
          console.error("Error loading partner referrals:", referralsError);
        }

        try {
          const { data: enriched, error: enrichError } = await supabase.functions.invoke('get-partner-referrals', {
            body: { partnerId: partnerData.id }
          });
          if (!enrichError && enriched?.referrals) {
            setReferrals(enriched.referrals as any);
          } else {
            if (referralsData) setReferrals(referralsData as any);
          }
        } catch (e) {
          console.warn('Edge function get-partner-referrals failed, fallback to basic data');
          if (referralsData) setReferrals(referralsData as any);
        }

        const { data: commissionsData } = await supabase
          .from("partner_commissions")
          .select("*")
          .eq("partner_id", partnerData.id)
          .order("created_at", { ascending: false })
          .limit(50);
        if (commissionsData) setCommissions(commissionsData);

        const { data: withdrawalsData } = await supabase
          .from("partner_withdrawals")
          .select("*")
          .eq("partner_id", partnerData.id)
          .order("requested_at", { ascending: false });
        if (withdrawalsData) setWithdrawals(withdrawalsData);
      }
    } catch (error) {
      console.error("Error loading partner data:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные партнера",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setTimeout(() => setChartsLoading(false), 500);
    }
  };

  const copyPartnerLink = () => {
    const link = `${window.location.origin}/auth?partner=${partner?.partner_code}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Скопировано",
      description: "Партнерская ссылка скопирована в буфер обмена"
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getFilteredCommissions = (days: number) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return commissions.filter(c => new Date(c.created_at) >= cutoffDate);
  };

  const getEarningsChartData = (days: number) => {
    const filtered = getFilteredCommissions(days);
    const grouped: { [key: string]: number } = {};
    const dates: string[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      dates.push(date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" }));
      grouped[dates[dates.length - 1]] = 0;
    }
    filtered.forEach(comm => {
      const date = new Date(comm.created_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
      if (grouped.hasOwnProperty(date)) {
        grouped[date] += parseFloat(comm.commission_amount.toString());
      }
    });
    return dates.map(date => ({ date, amount: grouped[date] }));
  };

  const getReferralsChartData = (days: number) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const filtered = referrals.filter(r => new Date(r.registered_at) >= cutoffDate);
    const grouped: { [key: string]: number } = {};
    const dates: string[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      dates.push(date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" }));
      grouped[dates[dates.length - 1]] = 0;
    }
    filtered.forEach(ref => {
      const date = new Date(ref.registered_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
      if (grouped.hasOwnProperty(date)) {
        grouped[date] += 1;
      }
    });
    return dates.map(date => ({ date, count: grouped[date] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Dashboard style */}
      <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1 overflow-hidden">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="shrink-0 rounded-xl hover:bg-secondary">
              <ArrowLeft className="h-[18px] w-[18px]" />
            </Button>
            <div className="hidden sm:flex w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 items-center justify-center">
              <Handshake className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <h1 className="text-lg md:text-xl font-bold text-foreground truncate">Партнерская программа</h1>
              <p className="text-xs text-muted-foreground hidden sm:block truncate">Зарабатывайте с каждым привлеченным клиентом</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className={`relative rounded-xl ${isMobile ? 'h-9 w-9' : 'h-10 w-10'} hover:bg-secondary`}>
                  <Avatar className={isMobile ? 'h-8 w-8' : 'h-9 w-9'}>
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold">
                      <UserIcon className={isMobile ? 'h-4 w-4' : 'h-[18px] w-[18px]'} />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-card border shadow-xl rounded-xl" align="end" forceMount>
                <DropdownMenuItem className="hover:bg-primary/5 cursor-pointer rounded-lg mx-1" onClick={() => navigate("/dashboard")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  <span>В дашборд</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="hover:bg-destructive/10 text-destructive cursor-pointer rounded-lg mx-1">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Выйти</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="container mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-5 md:space-y-6 max-w-6xl">
          
          {/* Stat Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            <StatCard
              icon={<Wallet className="w-5 h-5" />}
              label="Текущий баланс"
              value={`${(partner?.current_balance || 0).toLocaleString('ru-RU')} ₽`}
              delay={0}
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Всего заработано"
              value={`${(partner?.total_earned || 0).toLocaleString('ru-RU')} ₽`}
              trend={`${partner?.commission_rate || 0}%`}
              trendUp={true}
              delay={0.1}
            />
            <StatCard
              icon={<UserCheck className="w-5 h-5" />}
              label="Приглашённые клиенты"
              value={(partner?.invited_clients_count || 0).toLocaleString('ru-RU')}
              trend={partner?.status === "active" ? "Активен" : undefined}
              trendUp={partner?.status === "active"}
              delay={0.2}
            />
          </div>

          {/* Balance + Withdrawal */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card className="bg-card/80 backdrop-blur-xl border-border/50 rounded-2xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Вывод средств
                </CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="text-3xl font-bold text-foreground">
                    {partner?.current_balance || 0} ₽
                  </div>
                  {partner && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                      {partner.current_balance < 5000 && (
                        <p className="text-xs text-muted-foreground sm:order-2">
                          Минимум для вывода: 5 000 ₽
                        </p>
                      )}
                      <WithdrawalButton balance={partner.current_balance} partnerId={partner.id} hasBankDetails={hasBankDetails} onSuccess={loadPartnerData} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Charts */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6"
          >
            {/* Earnings Chart */}
            <Card className="bg-card/80 backdrop-blur-xl border-border/50 rounded-2xl">
              <CardHeader className="space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base font-medium">Заработок</CardTitle>
                </div>
                <div className="flex items-end justify-between">
                  {chartsLoading ? <Skeleton className="h-10 w-28" /> : (
                    <div className="text-3xl font-bold text-foreground">{partner?.total_earned || 0} ₽</div>
                  )}
                  <div className="flex gap-1">
                    {["7", "30", "90", "365"].map(d => (
                      <Button
                        key={d}
                        variant={earningsDateRange === d ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setEarningsDateRange(d)}
                        className="h-8 px-3 text-xs rounded-lg"
                        disabled={chartsLoading}
                      >
                        {d === "7" ? "7д" : d === "30" ? "30д" : d === "90" ? "3м" : "1г"}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {chartsLoading ? (
                  <div className="flex items-center justify-center h-[260px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : getEarningsChartData(parseInt(earningsDateRange)).length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={getEarningsChartData(parseInt(earningsDateRange))}>
                      <defs>
                        <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickMargin={8} axisLine={false} tickLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickMargin={8} axisLine={false} tickLine={false} allowDecimals={false} domain={[0, (dataMax: number) => Math.max(dataMax, 1)]} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }} formatter={(value: any) => [`${Number(value).toFixed(2)} ₽`, 'Сумма']} labelFormatter={(label: any) => `${label}`} />
                      <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#earningsGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                    Нет данных для отображения
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Clients Chart */}
            <Card className="bg-card/80 backdrop-blur-xl border-border/50 rounded-2xl">
              <CardHeader className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base font-medium">Приглашённые клиенты</CardTitle>
                </div>
                <div className="flex items-end justify-between">
                  {chartsLoading ? <Skeleton className="h-10 w-20" /> : (
                    <div className="text-3xl font-bold text-foreground">{partner?.invited_clients_count || 0}</div>
                  )}
                  <div className="flex gap-1">
                    {["7", "30", "90", "365"].map(d => (
                      <Button
                        key={d}
                        variant={clientsDateRange === d ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setClientsDateRange(d)}
                        className="h-8 px-3 text-xs rounded-lg"
                        disabled={chartsLoading}
                      >
                        {d === "7" ? "7д" : d === "30" ? "30д" : d === "90" ? "3м" : "1г"}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {chartsLoading ? (
                  <div className="flex items-center justify-center h-[260px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : getReferralsChartData(parseInt(clientsDateRange)).length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={getReferralsChartData(parseInt(clientsDateRange))}>
                      <defs>
                        <linearGradient id="clientsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickMargin={8} axisLine={false} tickLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickMargin={8} axisLine={false} tickLine={false} allowDecimals={false} domain={[0, 'dataMax + 1']} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }} formatter={(value: any) => [value, 'Пользователи']} labelFormatter={(label: any) => `${label}`} />
                      <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#clientsGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                    Нет данных для отображения
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Partner Link & Info */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card className="bg-card/80 backdrop-blur-xl border-border/50 rounded-2xl">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">Базовый тариф</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-muted-foreground">Статус:</span>
                      <Badge variant={partner?.status === "active" ? "default" : "secondary"}>
                        {partner?.status === "active" ? "Активный" : "Не активный"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground">{partner?.commission_rate}% в течение 12 месяцев</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    за каждый платеж клиента, приглашённого по реферальной ссылке
                  </p>
                </div>

                <div className="bg-muted/30 border border-border/50 rounded-xl p-5">
                  <h3 className="font-medium mb-3 text-foreground flex items-center gap-2 text-sm">
                    <Link2 className="h-4 w-4 text-primary" />
                    Ваша партнерская ссылка
                  </h3>
                  <div className="flex gap-2">
                    <Input value={`${window.location.origin}/auth?partner=${partner?.partner_code}`} readOnly className="flex-1 bg-background/80 rounded-xl" />
                    <Button onClick={copyPartnerLink} variant="outline" className="px-4 rounded-xl hover:bg-primary/5 hover:border-primary/30">
                      <Copy className="h-4 w-4 mr-2" />
                      Копировать
                    </Button>
                  </div>
                </div>

                {partner?.status === "inactive" && (
                  <div className="flex items-start gap-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Партнёрский статус станет активным после первого привлечённого платежа.
                    </p>
                  </div>
                )}

                <p className="text-sm text-muted-foreground">
                  Распространяя партнёрскую ссылку вы соглашаетесь с условиями{" "}
                  <a href="/partner-agreement" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Оферты партнерской программы
                  </a>
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Referrals and Withdrawals Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            <Card className="bg-card/80 backdrop-blur-xl border-border/50 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Партнёрские данные</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="clients">
                      <span className="sm:hidden">Клиенты</span>
                      <span className="hidden sm:inline">Приглашённые клиенты</span>
                    </TabsTrigger>
                    <TabsTrigger value="withdrawals">
                      <span className="sm:hidden">Выплаты</span>
                      <span className="hidden sm:inline">История выплат</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="clients" className="mt-6">
                    {referrals.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Пользователь</TableHead>
                              <TableHead>Дата регистрации</TableHead>
                              <TableHead>Сумма платежей</TableHead>
                              <TableHead>Ваша комиссия</TableHead>
                              <TableHead>Статус</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {referrals.map(ref => (
                              <TableRow key={ref.id}>
                                <TableCell>
                                  {ref.full_name || ref.masked_email || (ref.profiles?.email ? (() => {
                                    const email = ref.profiles.email;
                                    const [local, domain] = email.split('@');
                                    const maskedLocal = local.charAt(0) + '***';
                                    return `${maskedLocal}@${domain}`;
                                  })() : `ID: ${ref.referred_user_id.slice(0, 8)}…`)}
                                </TableCell>
                                <TableCell>
                                  {new Date(ref.registered_at).toLocaleDateString("ru-RU")}
                                </TableCell>
                                <TableCell>{Number(ref.total_payments || 0).toLocaleString('ru-RU')} ₽</TableCell>
                                <TableCell className="font-semibold">{Number(ref.total_commission || 0).toLocaleString('ru-RU')} ₽</TableCell>
                                <TableCell>
                                  <Badge variant={ref.status === "active" ? "default" : ref.status === "registered" ? "secondary" : "outline"}>
                                    {ref.status === "active" ? "Активен" : ref.status === "registered" ? "Зарегистрирован" : "Неактивен"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Пока нет приглашённых клиентов</p>
                        <p className="text-sm mt-2">Поделитесь своей партнёрской ссылкой</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="withdrawals" className="mt-6">
                    {withdrawals.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Дата запроса</TableHead>
                              <TableHead>Сумма</TableHead>
                              <TableHead>Статус</TableHead>
                              <TableHead>Дата обработки</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {withdrawals.map(withdrawal => (
                              <TableRow key={withdrawal.id}>
                                <TableCell>
                                  {new Date(withdrawal.requested_at).toLocaleDateString("ru-RU", {
                                    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
                                  })}
                                </TableCell>
                                <TableCell className="font-semibold">
                                  {Number(withdrawal.amount).toLocaleString('ru-RU')} ₽
                                </TableCell>
                                <TableCell>
                                  <Badge variant={withdrawal.status === "completed" ? "default" : withdrawal.status === "processing" ? "secondary" : "outline"}>
                                    {withdrawal.status === "completed" ? "Успешно" : withdrawal.status === "processing" ? "В обработке" : withdrawal.status === "pending" ? "Ожидает" : "Отклонено"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {withdrawal.processed_at ? new Date(withdrawal.processed_at).toLocaleDateString("ru-RU", {
                                    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
                                  }) : "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-muted-foreground">
                        <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Пока нет истории выплат</p>
                        <p className="text-sm mt-2">Запросите выплату, когда накопите достаточный баланс</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>

          {/* Bank Details */}
          {partner && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <BankDetailsForm partnerId={partner.id} />
            </motion.div>
          )}
        </div>
      </main>
      {!isMobile && <Footer />}
    </div>
  );
};

export default Partner;
