import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, LogOut, Copy, CreditCard, TrendingUp, Users, AlertCircle, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart, CartesianGrid, Legend } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BankDetailsForm } from "@/components/partner/BankDetailsForm";
import { WithdrawalButton } from "@/components/partner/WithdrawalButton";

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

const Partner = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [referrals, setReferrals] = useState<PartnerReferral[]>([]);
  const [commissions, setCommissions] = useState<PartnerCommission[]>([]);
  const [hasBankDetails, setHasBankDetails] = useState(false);
  const [dateRange, setDateRange] = useState("30"); // days
  const [earningsDateRange, setEarningsDateRange] = useState("30");
  const [clientsDateRange, setClientsDateRange] = useState("30");

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

      // Загрузка профиля партнера
      const { data: partnerData, error: partnerError } = await supabase
        .from("partner_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (partnerError && partnerError.code !== "PGRST116") {
        throw partnerError;
      }

      // Если партнера нет, создаем
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

        // Загрузка рефералов
        const { data: referralsData } = await supabase
          .from("partner_referrals")
          .select(`
            *,
            profiles:referred_user_id (email, full_name)
          `)
          .eq("partner_id", partnerData.id)
          .order("registered_at", { ascending: false });

        if (referralsData) setReferrals(referralsData as any);

        // Загрузка комиссий
        const { data: commissionsData } = await supabase
          .from("partner_commissions")
          .select("*")
          .eq("partner_id", partnerData.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (commissionsData) setCommissions(commissionsData);
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

  // График данных по дням для комиссий
  const getFilteredCommissions = (days: number) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return commissions.filter(c => new Date(c.created_at) >= cutoffDate);
  };

  const commissionsChartData = getFilteredCommissions(parseInt(dateRange))
    .reverse()
    .map((comm) => ({
      date: new Date(comm.created_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" }),
      amount: parseFloat(comm.commission_amount.toString())
    }));

  // График заработка по дням
  const getEarningsChartData = (days: number) => {
    const filtered = getFilteredCommissions(days);
    const grouped: { [key: string]: number } = {};
    
    filtered.forEach(comm => {
      const date = new Date(comm.created_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
      grouped[date] = (grouped[date] || 0) + parseFloat(comm.commission_amount.toString());
    });

    return Object.entries(grouped).map(([date, amount]) => ({ date, amount }));
  };

  // График рефералов по дням
  const getReferralsChartData = (days: number) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const filtered = referrals.filter(r => new Date(r.registered_at) >= cutoffDate);
    
    const grouped: { [key: string]: number } = {};
    
    filtered.forEach(ref => {
      const date = new Date(ref.registered_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
      grouped[date] = (grouped[date] || 0) + 1;
    });

    return Object.entries(grouped).map(([date, count]) => ({ date, count }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
                className="shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-semibold">Партнерская программа</h1>
                <p className="text-sm text-muted-foreground">Зарабатывайте с каждым привлеченным клиентом</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="container mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Balance Card - Full Width */}
        <Card className="bg-muted/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Текущий баланс
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-4xl font-bold">{partner?.current_balance || 0} ₽</div>
              {partner && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                  {partner.current_balance < 5000 && (
                    <p className="text-xs text-muted-foreground sm:order-2">
                      Минимальная сумма для вывода: 5 000 ₽
                    </p>
                  )}
                  <WithdrawalButton
                    balance={partner.current_balance}
                    partnerId={partner.id}
                    hasBankDetails={hasBankDetails}
                    onSuccess={loadPartnerData}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Charts with Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base font-medium">Всего заработано</CardTitle>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div className="text-4xl font-bold">{partner?.total_earned || 0} ₽</div>
                <div className="flex gap-1">
                  <Button
                    variant={earningsDateRange === "7" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setEarningsDateRange("7")}
                    className="h-8 px-3 text-xs"
                  >
                    7д
                  </Button>
                  <Button
                    variant={earningsDateRange === "30" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setEarningsDateRange("30")}
                    className="h-8 px-3 text-xs"
                  >
                    30д
                  </Button>
                  <Button
                    variant={earningsDateRange === "90" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setEarningsDateRange("90")}
                    className="h-8 px-3 text-xs"
                  >
                    3м
                  </Button>
                  <Button
                    variant={earningsDateRange === "365" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setEarningsDateRange("365")}
                    className="h-8 px-3 text-xs"
                  >
                    1г
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {getEarningsChartData(parseInt(earningsDateRange)).length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={getEarningsChartData(parseInt(earningsDateRange))}>
                    <defs>
                      <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      tickMargin={8}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      tickMargin={8}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px"
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#earningsGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                  Нет данных для отображения
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base font-medium">Приглашенные клиенты</CardTitle>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div className="text-4xl font-bold">{partner?.invited_clients_count || 0}</div>
                <div className="flex gap-1">
                  <Button
                    variant={clientsDateRange === "7" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setClientsDateRange("7")}
                    className="h-8 px-3 text-xs"
                  >
                    7д
                  </Button>
                  <Button
                    variant={clientsDateRange === "30" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setClientsDateRange("30")}
                    className="h-8 px-3 text-xs"
                  >
                    30д
                  </Button>
                  <Button
                    variant={clientsDateRange === "90" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setClientsDateRange("90")}
                    className="h-8 px-3 text-xs"
                  >
                    3м
                  </Button>
                  <Button
                    variant={clientsDateRange === "365" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setClientsDateRange("365")}
                    className="h-8 px-3 text-xs"
                  >
                    1г
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {getReferralsChartData(parseInt(clientsDateRange)).length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={getReferralsChartData(parseInt(clientsDateRange))}>
                    <defs>
                      <linearGradient id="clientsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      tickMargin={8}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      tickMargin={8}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px"
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#clientsGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                  Нет данных для отображения
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Program Info */}
        <Card className="bg-muted/30">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Базовый</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-muted-foreground">Статус партнера:</span>
                  <Badge variant={partner?.status === "active" ? "default" : "secondary"}>
                    {partner?.status === "active" ? "Активный" : "Не активный"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-2xl font-bold">{partner?.commission_rate}% в течение 12 месяцев</h3>
              <p className="text-sm text-muted-foreground mt-1">
                за каждый платеж клиента, приглашенного по реферальной ссылке
              </p>
            </div>

            <div className="bg-muted/30 border border-muted rounded-[12px] p-6 shadow-sm">
              <h3 className="font-medium mb-4 text-foreground flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Ваша партнерская ссылка:
              </h3>
              <div className="flex gap-2">
                <Input
                  value={`${window.location.origin}/auth?partner=${partner?.partner_code}`}
                  readOnly
                  className="flex-1 bg-background/80"
                />
                <Button
                  onClick={copyPartnerLink}
                  variant="outline"
                  className="px-4 bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:text-purple-800"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Копировать
                </Button>
              </div>
            </div>

            {partner?.status === "inactive" && (
              <div className="flex items-start gap-2 p-4 rounded-lg bg-amber-50 border border-amber-200">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Партнерский статус станет активным после первого привлеченного платежа.
                </p>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              Распространяя партнерскую ссылку вы соглашаетесь с условиями{" "}
              <a
                href="/partner-agreement"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Оферты партнерской программы
              </a>
            </p>
          </CardContent>
        </Card>

        {/* Tabs: Commissions & Referrals */}
        <Tabs defaultValue="commissions" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="commissions">История комиссий</TabsTrigger>
            <TabsTrigger value="referrals">Рефералы</TabsTrigger>
          </TabsList>

          <TabsContent value="commissions" className="space-y-4">
            <Card className="bg-muted/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Динамика комиссий</CardTitle>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 дней</SelectItem>
                      <SelectItem value="30">30 дней</SelectItem>
                      <SelectItem value="90">90 дней</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {commissionsChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={commissionsChartData}>
                      <defs>
                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="amount"
                        stroke="hsl(var(--primary))"
                        fillOpacity={1}
                        fill="url(#colorAmount)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Нет данных для отображения
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referrals" className="space-y-4">
            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle>Приглашенные клиенты</CardTitle>
              </CardHeader>
              <CardContent>
                {referrals.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Имя</TableHead>
                          <TableHead>Дата регистрации</TableHead>
                          <TableHead>Сумма платежей</TableHead>
                          <TableHead>Ваша комиссия</TableHead>
                          <TableHead>Статус</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {referrals.map((ref) => (
                          <TableRow key={ref.id}>
                            <TableCell>{ref.profiles?.email || "—"}</TableCell>
                            <TableCell>{ref.profiles?.full_name || "—"}</TableCell>
                            <TableCell>
                              {new Date(ref.registered_at).toLocaleDateString("ru-RU")}
                            </TableCell>
                            <TableCell>{ref.total_payments} ₽</TableCell>
                            <TableCell className="font-semibold">{ref.total_commission} ₽</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  ref.status === "active"
                                    ? "default"
                                    : ref.status === "registered"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {ref.status === "active"
                                  ? "Активен"
                                  : ref.status === "registered"
                                  ? "Зарегистрирован"
                                  : "Неактивен"}
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
                    <p>Пока нет приглашенных клиентов</p>
                    <p className="text-sm mt-2">Поделитесь своей партнерской ссылкой</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Bank Details */}
        {partner && <BankDetailsForm partnerId={partner.id} />}
        </div>
      </main>
    </div>
  );
};

export default Partner;
