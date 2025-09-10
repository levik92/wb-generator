import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { 
  Users, 
  DollarSign, 
  Activity, 
  Ban, 
  Shield, 
  Pencil, 
  LogOut,
  Search,
  UserCheck,
  TrendingUp,
  Download,
  Eye,
  Coins,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { AdminAnalyticsChart } from "@/components/dashboard/AdminAnalyticsChart";
import { PromptManager } from "@/components/dashboard/PromptManager";
import { DataExportDialog } from "@/components/dashboard/DataExportDialog";
import { PromoCodeManager } from "@/components/dashboard/PromoCodeManager";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  tokens_balance: number;
  wb_connected: boolean;
  is_blocked: boolean;
  created_at: string;
  referral_code: string;
}

interface UserStats {
  total_users: number;
  total_generations: number;
  total_tokens_spent: number;
  total_revenue: number;
}

interface UserDetails {
  totalPaid: number;
  tokensSpent: number;
  generationsCount: number;
  referralsCount: number;
  referralsEarnings: number;
  recentGenerations: any[];
  paymentHistory: any[];
  referrals: any[];
}

export default function Admin() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newTokenBalance, setNewTokenBalance] = useState<string>("");
  const [searchEmail, setSearchEmail] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  
  const usersPerPage = 20;
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    const filtered = users.filter(user => 
      user.email.toLowerCase().includes(searchEmail.toLowerCase())
    );
    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [users, searchEmail]);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .single();

      if (error || !userRoles) {
        toast({
          title: "Доступ запрещен",
          description: "У вас нет прав администратора",
          variant: "destructive",
        });
        navigate('/dashboard');
        return;
      }

      setIsAdmin(true);
      await Promise.all([loadUsers(), loadStats()]);
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить пользователей",
        variant: "destructive",
      });
    } else {
      setUsers(data || []);
    }
  };

  const loadStats = async () => {
    try {
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: totalGenerations } = await supabase
        .from('generations')
        .select('*', { count: 'exact', head: true });

      const { data: tokensData } = await supabase
        .from('token_transactions')
        .select('amount')
        .eq('transaction_type', 'generation');

      const totalTokensSpent = tokensData?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

      const { data: revenueData } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'succeeded');

      const totalRevenue = revenueData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      setStats({
        total_users: totalUsers || 0,
        total_generations: totalGenerations || 0,
        total_tokens_spent: totalTokensSpent,
        total_revenue: totalRevenue
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadUserDetails = async (user: User) => {
    setDetailsLoading(true);
    try {
      // Загружаем детальную информацию о пользователе
      const [paymentsRes, tokensRes, generationsRes, referralsRes] = await Promise.all([
        supabase.from('payments').select('*').eq('user_id', user.id).eq('status', 'succeeded'),
        supabase.from('token_transactions').select('*').eq('user_id', user.id).eq('transaction_type', 'generation'),
        supabase.from('generations').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('referrals').select('*, referred:profiles!referred_id(email)').eq('referrer_id', user.id)
      ]);

      const totalPaid = paymentsRes.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const tokensSpent = tokensRes.data?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
      const generationsCount = generationsRes.data?.length || 0;
      const referralsCount = referralsRes.data?.length || 0;
      const referralsEarnings = referralsRes.data?.reduce((sum, r) => sum + (r.tokens_awarded || 0), 0) || 0;

      setUserDetails({
        totalPaid,
        tokensSpent,
        generationsCount,
        referralsCount,
        referralsEarnings,
        recentGenerations: generationsRes.data || [],
        paymentHistory: paymentsRes.data || [],
        referrals: referralsRes.data || []
      });
    } catch (error) {
      console.error('Error loading user details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const toggleUserBlock = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_blocked: !currentStatus })
      .eq('id', userId);

    if (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось изменить статус пользователя",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Успешно",
        description: `Пользователь ${!currentStatus ? 'заблокирован' : 'разблокирован'}`,
      });
      await loadUsers();
    }
  };

  const updateTokenBalance = async () => {
    if (!editingUser || !newTokenBalance) return;

    const newBalance = parseInt(newTokenBalance);
    if (isNaN(newBalance) || newBalance < 0) {
      toast({
        title: "Ошибка",
        description: "Введите корректное количество токенов",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ tokens_balance: newBalance })
      .eq('id', editingUser.id);

    if (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить баланс токенов",
        variant: "destructive",
      });
    } else {
      const difference = newBalance - editingUser.tokens_balance;
      await supabase
        .from('token_transactions')
        .insert({
          user_id: editingUser.id,
          amount: difference,
          transaction_type: difference > 0 ? 'admin_bonus' : 'admin_adjustment',
          description: `Корректировка баланса администратором: ${difference > 0 ? '+' : ''}${difference} токенов`
        });

      toast({
        title: "Успешно",
        description: "Баланс токенов обновлен",
      });
      
      setEditingUser(null);
      setNewTokenBalance("");
      await loadUsers();
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">Загрузка админ-панели...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Админ-панель</h1>
            <p className="text-muted-foreground mt-1">Управление системой WB Генератор</p>
          </div>
          <div className="flex gap-2">
            <DataExportDialog>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Экспорт данных
              </Button>
            </DataExportDialog>
            <Button onClick={handleSignOut} variant="destructive" className="gap-2">
              <LogOut className="h-4 w-4" />
              Выйти
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Обзор</TabsTrigger>
            <TabsTrigger value="users">Пользователи</TabsTrigger>
            <TabsTrigger value="prompts">Промты</TabsTrigger>
          </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Analytics Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AdminAnalyticsChart type="users" />
                <AdminAnalyticsChart type="generations" />
                <AdminAnalyticsChart type="tokens" />
                <AdminAnalyticsChart type="revenue" />
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Активные пользователи</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {users.filter(u => !u.is_blocked).length}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {((users.filter(u => !u.is_blocked).length / users.length) * 100).toFixed(1)}% от общего числа
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Подключений WB</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      {users.filter(u => u.wb_connected).length}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {((users.filter(u => u.wb_connected).length / users.length) * 100).toFixed(1)}% пользователей
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Заблокированные</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-red-600">
                      {users.filter(u => u.is_blocked).length}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Требуют внимания
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Promo Codes Management */}
              <PromoCodeManager />
            </TabsContent>

          <TabsContent value="users" className="space-y-6">
            {/* Search */}
            <div className="flex items-center space-x-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Поиск по email..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                Найдено: {filteredUsers.length} из {users.length}
              </div>
            </div>

            {/* Users Table */}
            <Card>
              <CardHeader>
                <CardTitle>Управление пользователями</CardTitle>
                <CardDescription>
                  Просмотр и управление всеми пользователями системы
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Имя</TableHead>
                        <TableHead>Токены</TableHead>
                        <TableHead>WB</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Дата регистрации</TableHead>
                        <TableHead>Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium cursor-pointer hover:text-primary" 
                            onClick={() => {
                              setSelectedUser(user);
                              loadUserDetails(user);
                            }}>
                            {user.email}
                          </TableCell>
                          <TableCell>{user.full_name || 'Не указано'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{user.tokens_balance}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.wb_connected ? "default" : "secondary"}>
                              {user.wb_connected ? 'Подключен' : 'Не подключен'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.is_blocked ? "destructive" : "default"}>
                              {user.is_blocked ? 'Заблокирован' : 'Активен'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(user.created_at).toLocaleDateString('ru-RU')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  loadUserDetails(user);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingUser(user);
                                      setNewTokenBalance(user.tokens_balance.toString());
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Редактировать баланс токенов</DialogTitle>
                                    <DialogDescription>
                                      Пользователь: {user.email}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <Label htmlFor="tokens" className="text-right">
                                        Токены
                                      </Label>
                                      <Input
                                        id="tokens"
                                        type="number"
                                        min="0"
                                        value={newTokenBalance}
                                        onChange={(e) => setNewTokenBalance(e.target.value)}
                                        className="col-span-3"
                                      />
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button onClick={updateTokenBalance}>
                                      Сохранить изменения
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              
                              <Button
                                variant={user.is_blocked ? "default" : "destructive"}
                                size="sm"
                                onClick={() => toggleUserBlock(user.id, user.is_blocked)}
                              >
                                {user.is_blocked ? <Shield className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between space-x-2 py-4">
                    <div className="text-sm text-muted-foreground">
                      Страница {currentPage} из {totalPages} (всего {filteredUsers.length} пользователей)
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Назад
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Вперед
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prompts" className="space-y-6">
            <PromptManager />
          </TabsContent>
        </Tabs>

        {/* User Details Modal */}
        <Dialog open={!!selectedUser} onOpenChange={() => {
          setSelectedUser(null);
          setUserDetails(null);
        }}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Детали пользователя</DialogTitle>
              <DialogDescription>
                {selectedUser?.email}
              </DialogDescription>
            </DialogHeader>
            
            {detailsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : userDetails ? (
              <Tabs defaultValue="stats" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="stats">Статистика</TabsTrigger>
                  <TabsTrigger value="payments">Платежи</TabsTrigger>
                  <TabsTrigger value="generations">Генерации</TabsTrigger>
                  <TabsTrigger value="referrals">Рефералы</TabsTrigger>
                </TabsList>
                
                <TabsContent value="stats" className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{userDetails.totalPaid.toLocaleString('ru-RU')}₽</div>
                        <p className="text-xs text-muted-foreground">Оплачено</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{userDetails.tokensSpent}</div>
                        <p className="text-xs text-muted-foreground">Токенов потрачено</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{userDetails.generationsCount}</div>
                        <p className="text-xs text-muted-foreground">Генераций</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{userDetails.referralsCount}</div>
                        <p className="text-xs text-muted-foreground">Рефералов</p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="payments">
                  <div className="space-y-2">
                    {userDetails.paymentHistory.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">Нет платежей</p>
                    ) : (
                      userDetails.paymentHistory.map((payment: any) => (
                        <div key={payment.id} className="flex justify-between items-center p-3 border rounded">
                          <div>
                            <div className="font-medium">{payment.package_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(payment.created_at).toLocaleDateString('ru-RU')}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{Number(payment.amount).toLocaleString('ru-RU')}₽</div>
                            <div className="text-sm text-green-600">{payment.tokens_amount} токенов</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="generations">
                  <div className="space-y-2">
                    {userDetails.recentGenerations.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">Нет генераций</p>
                    ) : (
                      userDetails.recentGenerations.map((generation: any) => (
                        <div key={generation.id} className="flex justify-between items-center p-3 border rounded">
                          <div>
                            <div className="font-medium">{generation.generation_type}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(generation.created_at).toLocaleDateString('ru-RU')}
                            </div>
                          </div>
                          <Badge variant={generation.status === 'completed' ? 'default' : 
                                        generation.status === 'failed' ? 'destructive' : 'secondary'}>
                            {generation.status}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="referrals">
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-lg font-bold">{userDetails.referralsEarnings} токенов</div>
                        <p className="text-sm text-muted-foreground">Заработано за рефералов</p>
                      </CardContent>
                    </Card>
                    <div className="space-y-2">
                      {userDetails.referrals.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">Нет рефералов</p>
                      ) : (
                        userDetails.referrals.map((referral: any) => (
                          <div key={referral.id} className="flex justify-between items-center p-3 border rounded">
                            <div>
                              <div className="font-medium">{referral.referred?.email}</div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(referral.created_at).toLocaleDateString('ru-RU')}
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="secondary">{referral.status}</Badge>
                              {referral.tokens_awarded && (
                                <div className="text-sm text-green-600">+{referral.tokens_awarded} токенов</div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}