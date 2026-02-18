import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Ban, Pencil, Search, UserCheck, Eye, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  tokens_balance: number;
  wb_connected: boolean;
  is_blocked: boolean;
  created_at: string;
  referral_code: string;
  updated_at: string;
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
  tokenTransactions: any[];
}
interface AdminUsersProps {
  users: User[];
  onUsersUpdate: () => void;
}

type PaymentFilter = 'all' | 'paid' | 'free';

export function AdminUsers({
  users,
  onUsersUpdate
}: AdminUsersProps) {
  const [filteredUsers, setFilteredUsers] = useState<User[]>(users);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newTokenBalance, setNewTokenBalance] = useState<string>("");
  const [searchEmail, setSearchEmail] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [paidUserIds, setPaidUserIds] = useState<Set<string>>(new Set());
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [paidDataLoading, setPaidDataLoading] = useState(true);
  const isMobile = useIsMobile();
  const usersPerPage = 20;
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  // Load paid user IDs
  useEffect(() => {
    const loadPaidUsers = async () => {
      setPaidDataLoading(true);
      try {
        const { data, error } = await supabase
          .from('payments')
          .select('user_id')
          .eq('status', 'succeeded');
        
        if (error) throw error;
        const ids = new Set((data || []).map(p => p.user_id));
        setPaidUserIds(ids);
      } catch (error) {
        console.error('Error loading paid users:', error);
      } finally {
        setPaidDataLoading(false);
      }
    };
    loadPaidUsers();
  }, []);

  // Update filtered users when users prop, search, or filter changes
  useEffect(() => {
    let filtered = users.filter(user => user.email.toLowerCase().includes(searchEmail.toLowerCase()));
    
    if (paymentFilter === 'paid') {
      filtered = filtered.filter(user => paidUserIds.has(user.id));
    } else if (paymentFilter === 'free') {
      filtered = filtered.filter(user => !paidUserIds.has(user.id));
    }
    
    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [users, searchEmail, paymentFilter, paidUserIds]);

  const loadUserDetails = async (user: User) => {
    setDetailsLoading(true);
    try {
      const referralsRes = await supabase.from('referrals').select('*').eq('referrer_id', user.id);
      const referralsWithEmails = await Promise.all((referralsRes.data || []).map(async ref => {
        const { data: refData } = await supabase.rpc('admin_get_profile', {
          target_user_id: ref.referred_id,
          access_reason: 'View referral details'
        });
        return { ...ref, referred: { email: refData?.[0]?.email || 'Unknown' } };
      }));
      const [paymentsRes, tokensRes, generationsCountRes, generationsRes, allTransactionsRes] = await Promise.all([
        supabase.from('payments').select('*').eq('user_id', user.id).eq('status', 'succeeded'),
        supabase.from('token_transactions').select('*').eq('user_id', user.id).eq('transaction_type', 'generation'),
        supabase.from('generations').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('generations').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('token_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
      ]);
      const totalPaid = paymentsRes.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const tokensSpent = tokensRes.data?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
      const generationsCount = generationsCountRes.count ?? 0;
      const referralsCount = referralsWithEmails.length;
      const referralsEarnings = referralsWithEmails.reduce((sum, r) => sum + (r.tokens_awarded || 0), 0);
      setUserDetails({
        totalPaid, tokensSpent, generationsCount, referralsCount, referralsEarnings,
        recentGenerations: generationsRes.data || [],
        paymentHistory: paymentsRes.data || [],
        referrals: referralsWithEmails,
        tokenTransactions: allTransactionsRes.data || []
      });
    } catch (error) {
      console.error('Error loading user details:', error);
      toast({ title: "Ошибка", description: "Не удалось загрузить детали пользователя", variant: "destructive" });
    } finally {
      setDetailsLoading(false);
    }
  };

  const toggleUserBlock = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.rpc('admin_toggle_user_block', {
        target_user_id: userId,
        block_status: !currentStatus
      });
      if (error) throw error;
      toast({ title: "Успешно", description: `Пользователь ${!currentStatus ? 'заблокирован' : 'разблокирован'}` });
      setTimeout(async () => {
        await onUsersUpdate();
        const updatedUsers = users.map(u => u.id === userId ? { ...u, is_blocked: !currentStatus } : u);
        setFilteredUsers(updatedUsers.filter(user => user.email.toLowerCase().includes(searchEmail.toLowerCase())));
      }, 300);
    } catch (error: any) {
      console.error('Error toggling user block:', error);
      toast({ title: "Ошибка", description: error.message || "Не удалось изменить статус пользователя", variant: "destructive" });
    }
  };

  const updateTokenBalance = async () => {
    if (!editingUser || !newTokenBalance) return;
    const newBalance = parseInt(newTokenBalance);
    if (isNaN(newBalance) || newBalance < 0) {
      toast({ title: "Ошибка", description: "Введите корректное количество токенов", variant: "destructive" });
      return;
    }
    const { error } = await supabase.rpc('admin_update_user_tokens', {
      target_user_id: editingUser.id,
      new_balance: newBalance,
      reason: 'Корректировка баланса администратором'
    });
    if (error) {
      toast({ title: "Ошибка", description: "Не удалось обновить баланс токенов", variant: "destructive" });
    } else {
      toast({ title: "Успешно", description: "Баланс токенов обновлен" });
      setEditingUser(null);
      setNewTokenBalance("");
      onUsersUpdate();
    }
  };

  const filterLabel = paymentFilter === 'all' ? 'Все' : paymentFilter === 'paid' ? 'Платные' : 'Бесплатные';

  return <div className="space-y-6 min-w-0 overflow-hidden">
      {/* Search & Filter */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input placeholder="Поиск по email..." value={searchEmail} onChange={e => setSearchEmail(e.target.value)} className="pl-10" />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {isMobile ? (
                <Button variant="outline" size="sm" className="h-9 w-9 p-0 shrink-0">
                  <Filter className="h-4 w-4" />
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
                  <Filter className="h-3.5 w-3.5" />
                  {filterLabel}
                </Button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setPaymentFilter('all')} className={`hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary ${paymentFilter === 'all' ? 'bg-primary text-primary-foreground focus:bg-primary focus:text-primary-foreground hover:bg-primary hover:text-primary-foreground' : ''}`}>
                Все пользователи
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPaymentFilter('paid')} className={`hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary ${paymentFilter === 'paid' ? 'bg-primary text-primary-foreground focus:bg-primary focus:text-primary-foreground hover:bg-primary hover:text-primary-foreground' : ''}`}>
                Платные
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPaymentFilter('free')} className={`hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary ${paymentFilter === 'free' ? 'bg-primary text-primary-foreground focus:bg-primary focus:text-primary-foreground hover:bg-primary hover:text-primary-foreground' : ''}`}>
                Бесплатные
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="text-xs text-muted-foreground">
          Найдено: {filteredUsers.length} из {users.length}
        </div>
      </div>

      {/* Users Table */}
      <Card className="bg-card/80 backdrop-blur-xl border-border/50 rounded-2xl w-full min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg">Управление пользователями</CardTitle>
          <CardDescription>
            Просмотр и управление всеми пользователями системы
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 md:p-4 min-w-0">
          <div className="rounded-md border overflow-x-auto max-w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Email</TableHead>
                  <TableHead className="min-w-[100px] hidden lg:table-cell">Имя</TableHead>
                  <TableHead className="min-w-[70px]">Токены</TableHead>
                  <TableHead className="min-w-[70px]">Оплата</TableHead>
                  <TableHead className="min-w-[80px]">Статус</TableHead>
                  <TableHead className="min-w-[110px] hidden lg:table-cell">Дата регистрации</TableHead>
                  <TableHead className="min-w-[100px]">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentUsers.map(user => {
                  const isPaid = paidUserIds.has(user.id);
                  return <TableRow key={user.id}>
                    <TableCell className="font-medium cursor-pointer hover:text-primary max-w-[180px] truncate text-xs md:text-sm" onClick={() => {
                      setSelectedUser(user);
                      loadUserDetails(user);
                    }}>
                      {user.email}
                    </TableCell>
                    <TableCell className="max-w-[100px] truncate text-xs hidden lg:table-cell">{user.full_name || 'Не указано'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{user.tokens_balance}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-xs ${isPaid ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30' : ''}`}>
                        {paidDataLoading ? '...' : isPaid ? 'Да' : 'Нет'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        if (user.is_blocked) {
                          return <Badge variant="destructive" className="text-xs">Блок</Badge>;
                        }
                        const thirtyDaysAgo = new Date();
                        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                        const isActive = new Date(user.updated_at) > thirtyDaysAgo;
                        return isActive
                          ? <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30">Актив.</Badge>
                          : <Badge variant="secondary" className="text-xs">Не актив.</Badge>;
                      })()}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">
                      {new Date(user.created_at).toLocaleDateString('ru-RU')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-0.5 md:gap-1">
                        <Button variant="outline" size="sm" onClick={() => {
                          setSelectedUser(user);
                          loadUserDetails(user);
                        }} className="h-7 w-7 md:h-8 md:w-8 p-0">
                          <Eye className="h-3 w-3" />
                        </Button>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => {
                              setEditingUser(user);
                              setNewTokenBalance(user.tokens_balance.toString());
                            }} className="h-7 w-7 md:h-8 md:w-8 p-0">
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md mx-2">
                            <DialogHeader>
                              <DialogTitle className="text-base md:text-lg">Изменить баланс токенов</DialogTitle>
                              <DialogDescription className="text-xs md:text-sm break-all">
                                Пользователь: {editingUser?.email}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="tokens">Новый баланс токенов</Label>
                                <Input id="tokens" type="number" min="0" value={newTokenBalance} onChange={e => setNewTokenBalance(e.target.value)} />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button onClick={updateTokenBalance}>Сохранить</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Button variant={user.is_blocked ? "default" : "destructive"} size="sm" onClick={() => toggleUserBlock(user.id, user.is_blocked)} className="h-7 w-7 md:h-8 md:w-8 p-0">
                          {user.is_blocked ? <UserCheck className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>;
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && <div className="flex flex-col sm:flex-row items-center justify-between mt-3 md:mt-4 gap-2 px-2">
              <div className="text-xs md:text-sm text-muted-foreground order-2 sm:order-1">
                Показано {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} из {filteredUsers.length}
              </div>
              <div className="flex items-center gap-1 md:gap-2 order-1 sm:order-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="h-8">
                  <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden md:inline ml-1">Назад</span>
                </Button>
                <span className="text-xs md:text-sm px-1 md:px-2 whitespace-nowrap">
                  {currentPage} / {totalPages}
                </span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="h-8">
                  <span className="hidden md:inline mr-1">Вперед</span>
                  <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              </div>
            </div>}
        </CardContent>
      </Card>

      {/* User Details Modal */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-2rem)] lg:max-w-4xl max-h-[85vh] overflow-y-auto mx-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">Детали пользователя</DialogTitle>
            <DialogDescription className="break-all text-xs md:text-sm">
              {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          {detailsLoading ? <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div> : userDetails && <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="bg-green-500/10 dark:bg-green-500/20 border border-green-500/30 rounded-lg p-2.5 sm:p-3">
                  <div className="text-sm sm:text-base lg:text-lg font-semibold text-green-600 dark:text-green-400 truncate">
                    {userDetails.totalPaid}₽
                  </div>
                  <div className="text-[10px] sm:text-xs text-green-600/80 dark:text-green-400/80">Всего оплачено</div>
                </div>
                <div className="bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 rounded-lg p-2.5 sm:p-3">
                  <div className="text-sm sm:text-base lg:text-lg font-semibold text-blue-600 dark:text-blue-400 truncate">
                    {userDetails.tokensSpent}
                  </div>
                  <div className="text-[10px] sm:text-xs text-blue-600/80 dark:text-blue-400/80">Потрачено токенов</div>
                </div>
                <div className="bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/30 rounded-lg p-2.5 sm:p-3">
                  <div className="text-sm sm:text-base lg:text-lg font-semibold text-purple-600 dark:text-purple-400 truncate">
                    {userDetails.generationsCount}
                  </div>
                  <div className="text-[10px] sm:text-xs text-purple-600/80 dark:text-purple-400/80">Генераций</div>
                </div>
                <div className="bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/30 rounded-lg p-2.5 sm:p-3">
                  <div className="text-sm sm:text-base lg:text-lg font-semibold text-orange-600 dark:text-orange-400 truncate">
                    {userDetails.referralsCount}
                  </div>
                  <div className="text-[10px] sm:text-xs text-orange-600/80 dark:text-orange-400/80">Рефералов</div>
                </div>
              </div>

              {/* Payment History */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-sm sm:text-lg font-semibold">История платежей</h3>
                <div className="max-h-48 overflow-auto border rounded">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[100px]">Дата</TableHead>
                          <TableHead className="min-w-[80px]">Сумма</TableHead>
                          <TableHead className="min-w-[80px]">Токены</TableHead>
                          <TableHead className="min-w-[80px]">Статус</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userDetails.paymentHistory.map((payment: any) => <TableRow key={payment.id}>
                            <TableCell className="text-xs">
                              {new Date(payment.created_at).toLocaleDateString('ru-RU')}
                            </TableCell>
                            <TableCell className="text-xs">{payment.amount}₽</TableCell>
                            <TableCell className="text-xs">{payment.tokens_amount}</TableCell>
                            <TableCell>
                              <Badge variant={payment.status === 'succeeded' ? 'default' : 'secondary'} className="text-xs">
                                {payment.status === 'succeeded' ? 'Оплачен' : payment.status}
                              </Badge>
                            </TableCell>
                          </TableRow>)}
                        {userDetails.paymentHistory.length === 0 && <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground text-xs">
                              Нет платежей
                            </TableCell>
                          </TableRow>}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              {/* Token Transactions */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-sm sm:text-lg font-semibold">История токенов</h3>
                <div className="max-h-64 overflow-auto border rounded">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[100px]">Дата</TableHead>
                          <TableHead className="min-w-[80px]">Кол-во</TableHead>
                          <TableHead className="min-w-[100px]">Тип</TableHead>
                          <TableHead className="min-w-[150px]">Описание</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userDetails.tokenTransactions.map((tx: any) => {
                          const typeLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
                            purchase: { label: 'Оплата', variant: 'default' },
                            bonus: { label: 'Бонус', variant: 'secondary' },
                            generation: { label: 'Генерация', variant: 'outline' },
                            referral_bonus: { label: 'Реферал', variant: 'secondary' },
                            promocode: { label: 'Промокод', variant: 'secondary' },
                            refund: { label: 'Возврат', variant: 'secondary' },
                            direct_sql_update: { label: 'Прямой SQL', variant: 'destructive' },
                          };
                          const typeInfo = typeLabels[tx.transaction_type] || { label: tx.transaction_type, variant: 'outline' as const };
                          return (
                            <TableRow key={tx.id}>
                              <TableCell className="text-xs">
                                {new Date(tx.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </TableCell>
                              <TableCell className={`text-xs font-medium ${tx.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {tx.amount > 0 ? '+' : ''}{tx.amount}
                              </TableCell>
                              <TableCell>
                                <Badge variant={typeInfo.variant} className="text-xs">
                                  {typeInfo.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                                {tx.description || '—'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {userDetails.tokenTransactions.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground text-xs">
                              Нет транзакций
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              {/* Referrals */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-sm sm:text-lg font-semibold">Рефералы ({userDetails.referralsCount})</h3>
                {userDetails.referrals.length > 0 ? <div className="max-h-48 overflow-auto border rounded">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[150px]">Email</TableHead>
                            <TableHead className="min-w-[100px]">Дата</TableHead>
                            <TableHead className="min-w-[80px]">Статус</TableHead>
                            <TableHead className="min-w-[80px]">Токенов</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userDetails.referrals.map((ref: any) => <TableRow key={ref.id}>
                              <TableCell className="text-xs">{ref.referred?.email || 'Unknown'}</TableCell>
                              <TableCell className="text-xs">
                                {new Date(ref.created_at).toLocaleDateString('ru-RU')}
                              </TableCell>
                              <TableCell>
                                <Badge variant={ref.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                                  {ref.status === 'completed' ? 'Завершен' : 'Ожидание'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">{ref.tokens_awarded || 0}</TableCell>
                            </TableRow>)}
                        </TableBody>
                      </Table>
                    </div>
                  </div> : <p className="text-sm text-muted-foreground">Нет рефералов</p>}
              </div>
            </div>}
        </DialogContent>
      </Dialog>
    </div>;
}
