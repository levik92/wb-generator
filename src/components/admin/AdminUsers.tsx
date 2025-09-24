import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Ban, 
  Shield, 
  Pencil, 
  Search,
  UserCheck,
  Eye,
  Coins,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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

interface AdminUsersProps {
  users: User[];
  onUsersUpdate: () => void;
}

export function AdminUsers({ users, onUsersUpdate }: AdminUsersProps) {
  const [filteredUsers, setFilteredUsers] = useState<User[]>(users);
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

  // Update filtered users when users prop changes or search changes
  useEffect(() => {
    const filtered = users.filter(user => 
      user.email.toLowerCase().includes(searchEmail.toLowerCase())
    );
    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [users, searchEmail]);

  const loadUserDetails = async (user: User) => {
    setDetailsLoading(true);
    try {
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
      onUsersUpdate();
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
      onUsersUpdate();
    }
  };

  return (
    <div className="space-y-6">
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
        <CardContent className="p-4">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Email</TableHead>
                  <TableHead className="min-w-[120px]">Имя</TableHead>
                  <TableHead className="min-w-[80px]">Токены</TableHead>
                  <TableHead className="min-w-[100px] hidden sm:table-cell">WB</TableHead>
                  <TableHead className="min-w-[100px]">Статус</TableHead>
                  <TableHead className="min-w-[120px] hidden md:table-cell">Дата регистрации</TableHead>
                  <TableHead className="min-w-[120px]">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium cursor-pointer hover:text-primary max-w-[200px] truncate" 
                      onClick={() => {
                        setSelectedUser(user);
                        loadUserDetails(user);
                      }}>
                      {user.email}
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate">{user.full_name || 'Не указано'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{user.tokens_balance}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={user.wb_connected ? "default" : "secondary"} className="text-xs">
                        {user.wb_connected ? 'Подключен' : 'Не подключен'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_blocked ? "destructive" : "default"} className="text-xs">
                        {user.is_blocked ? 'Заблокирован' : 'Активен'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {new Date(user.created_at).toLocaleDateString('ru-RU')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            loadUserDetails(user);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-3 w-3" />
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
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-sm">
                            <DialogHeader>
                              <DialogTitle className="text-lg">Изменить баланс токенов</DialogTitle>
                              <DialogDescription className="text-sm">
                                Пользователь: {editingUser?.email}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="tokens">Новый баланс токенов</Label>
                                <Input
                                  id="tokens"
                                  type="number"
                                  min="0"
                                  value={newTokenBalance}
                                  onChange={(e) => setNewTokenBalance(e.target.value)}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button onClick={updateTokenBalance}>Сохранить</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant={user.is_blocked ? "default" : "destructive"}
                          size="sm"
                          onClick={() => toggleUserBlock(user.id, user.is_blocked)}
                          className="h-8 w-8 p-0"
                        >
                          {user.is_blocked ? (
                            <UserCheck className="h-3 w-3" />
                          ) : (
                            <Ban className="h-3 w-3" />
                          )}
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
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-2">
              <div className="text-sm text-muted-foreground order-2 sm:order-1">
                Показано {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} из {filteredUsers.length}
              </div>
              <div className="flex items-center space-x-2 order-1 sm:order-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Назад</span>
                </Button>
                <span className="text-sm px-2">
                  {currentPage} из {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <span className="hidden sm:inline mr-1">Вперед</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Details Modal */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-2">
          <DialogHeader>
            <DialogTitle>Детали пользователя</DialogTitle>
            <DialogDescription className="break-all">
              {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          {detailsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : userDetails && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-base lg:text-lg font-semibold text-green-800">
                    {userDetails.totalPaid}₽
                  </div>
                  <div className="text-xs text-green-600">Всего оплачено</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-base lg:text-lg font-semibold text-blue-800">
                    {userDetails.tokensSpent}
                  </div>
                  <div className="text-xs text-blue-600">Потрачено токенов</div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="text-base lg:text-lg font-semibold text-purple-800">
                    {userDetails.generationsCount}
                  </div>
                  <div className="text-xs text-purple-600">Генераций</div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="text-base lg:text-lg font-semibold text-orange-800">
                    {userDetails.referralsCount}
                  </div>
                  <div className="text-xs text-orange-600">Рефералов</div>
                </div>
              </div>

              {/* Tabs or sections for different data */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">История платежей</h3>
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
                        {userDetails.paymentHistory.map((payment: any) => (
                          <TableRow key={payment.id}>
                            <TableCell className="text-xs">
                              {new Date(payment.created_at).toLocaleDateString('ru-RU')}
                            </TableCell>
                            <TableCell>{payment.amount}₽</TableCell>
                            <TableCell>{payment.tokens_amount}</TableCell>
                            <TableCell>
                              <Badge variant="default" className="text-xs">{payment.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Рефералы</h3>
                <div className="max-h-48 overflow-auto border rounded">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[150px]">Email реферала</TableHead>
                          <TableHead className="min-w-[100px]">Дата</TableHead>
                          <TableHead className="min-w-[80px]">Награда</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userDetails.referrals.map((referral: any) => (
                          <TableRow key={referral.id}>
                             <TableCell className="truncate max-w-[150px]">{referral.referred?.email}</TableCell>
                            <TableCell className="text-xs">
                              {new Date(referral.created_at).toLocaleDateString('ru-RU')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {referral.tokens_awarded} токенов
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}