import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { Label } from "@/components/ui/label";
import { Ban, Pencil, Search, UserCheck, Eye, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { SurveyStats } from "./SurveyStats";
import { TransactionDetailDialog } from "./TransactionDetailDialog";
import { UserFiltersPopover, EMPTY_FILTERS, type UserFiltersState } from "./UserFiltersPopover";

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
  last_active_at?: string;
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
  surveyResponses: { question_key: string; answer: string }[];
  utmSourceName: string | null;
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
  const [filters, setFilters] = useState<UserFiltersState>({
    payment: new Set(),
    activity: new Set(),
    utm: new Set(),
    who: new Set(),
    volume: new Set(),
    channel: new Set(),
  });
  const [paidDataLoading, setPaidDataLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  // Filter source data
  const [profileUtmMap, setProfileUtmMap] = useState<Record<string, string>>({}); // user_id -> utm_source_id
  const [surveyByUser, setSurveyByUser] = useState<Record<string, Record<string, string>>>({});
  // user_id -> { question_key: answer }
  const [utmSources, setUtmSources] = useState<{ id: string; name: string }[]>([]);
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

  // Load filter source data: UTM mapping, survey responses, UTM source list
  useEffect(() => {
    const loadFilterData = async () => {
      try {
        // UTM sources list
        const { data: sourcesData } = await supabase
          .from('utm_sources')
          .select('id, name')
          .order('name', { ascending: true });
        setUtmSources((sourcesData || []) as { id: string; name: string }[]);

        // Profile -> UTM source mapping (batch fetch all profiles with utm_source_id)
        const profileMap: Record<string, string> = {};
        let from = 0;
        const batchSize = 1000;
        while (true) {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, utm_source_id')
            .not('utm_source_id', 'is', null)
            .range(from, from + batchSize - 1);
          if (error || !data || data.length === 0) break;
          for (const p of data as { id: string; utm_source_id: string | null }[]) {
            if (p.utm_source_id) profileMap[p.id] = p.utm_source_id;
          }
          if (data.length < batchSize) break;
          from += batchSize;
        }
        setProfileUtmMap(profileMap);

        // Survey responses (only the 3 keys we filter on)
        const surveyMap: Record<string, Record<string, string>> = {};
        let sFrom = 0;
        while (true) {
          const { data, error } = await (supabase as any)
            .from('user_survey_responses')
            .select('user_id, question_key, answer')
            .in('question_key', ['who_are_you', 'monthly_volume', 'acquisition_channel'])
            .range(sFrom, sFrom + batchSize - 1);
          if (error || !data || data.length === 0) break;
          for (const r of data as { user_id: string; question_key: string; answer: string }[]) {
            if (!surveyMap[r.user_id]) surveyMap[r.user_id] = {};
            surveyMap[r.user_id][r.question_key] = r.answer;
          }
          if (data.length < batchSize) break;
          sFrom += batchSize;
        }
        setSurveyByUser(surveyMap);
      } catch (e) {
        console.error('Error loading filter data:', e);
      }
    };
    loadFilterData();
  }, []);

  // Build dynamic option lists for survey questions from collected data
  const surveyOptionsByKey = useMemo(() => {
    const sets: Record<string, Set<string>> = {
      who_are_you: new Set(),
      monthly_volume: new Set(),
      acquisition_channel: new Set(),
    };
    for (const userId in surveyByUser) {
      const r = surveyByUser[userId];
      for (const k of Object.keys(sets)) {
        if (r[k]) {
          // Normalize "Другое: ..." into "Другое" for filter grouping
          const val = r[k].startsWith('Другое:') ? 'Другое' : r[k];
          sets[k].add(val);
        }
      }
    }
    return {
      who: Array.from(sets.who_are_you).sort(),
      volume: Array.from(sets.monthly_volume).sort(),
      channel: Array.from(sets.acquisition_channel).sort(),
    };
  }, [surveyByUser]);

  // Apply all filters
  useEffect(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const filtered = users.filter(user => {
      // Search
      if (searchEmail && !user.email.toLowerCase().includes(searchEmail.toLowerCase())) {
        return false;
      }
      // Payment
      if (filters.payment.size > 0) {
        const isPaid = paidUserIds.has(user.id);
        const wantsPaid = filters.payment.has('paid');
        const wantsFree = filters.payment.has('free');
        if (!((isPaid && wantsPaid) || (!isPaid && wantsFree))) return false;
      }
      // Activity
      if (filters.activity.size > 0) {
        const ts = user.last_active_at ?? user.updated_at;
        const isActive = !user.is_blocked && new Date(ts) > thirtyDaysAgo;
        const wantsActive = filters.activity.has('active');
        const wantsInactive = filters.activity.has('inactive');
        if (!((isActive && wantsActive) || (!isActive && wantsInactive))) return false;
      }
      // UTM
      if (filters.utm.size > 0) {
        const utmId = profileUtmMap[user.id];
        const matches = utmId ? filters.utm.has(utmId) : filters.utm.has('__direct__');
        if (!matches) return false;
      }
      // Survey filters
      const survey = surveyByUser[user.id] || {};
      const surveyMatch = (set: Set<string>, key: string) => {
        if (set.size === 0) return true;
        const ans = survey[key];
        if (!ans) return false;
        const norm = ans.startsWith('Другое:') ? 'Другое' : ans;
        return set.has(norm);
      };
      if (!surveyMatch(filters.who, 'who_are_you')) return false;
      if (!surveyMatch(filters.volume, 'monthly_volume')) return false;
      if (!surveyMatch(filters.channel, 'acquisition_channel')) return false;

      return true;
    });

    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [users, searchEmail, filters, paidUserIds, profileUtmMap, surveyByUser]);

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
      // Load UTM source info
      const { data: profileData } = await supabase
        .from('profiles')
        .select('utm_source_id')
        .eq('id', user.id)
        .maybeSingle();
      
      let utmSourceName: string | null = null;
      if (profileData?.utm_source_id) {
        const { data: utmData } = await supabase
          .from('utm_sources')
          .select('name, utm_source, utm_medium, utm_campaign')
          .eq('id', profileData.utm_source_id)
          .maybeSingle();
        if (utmData) {
          utmSourceName = utmData.name || `${utmData.utm_source}${utmData.utm_medium ? ` / ${utmData.utm_medium}` : ''}`;
        }
      }

      const [paymentsRes, tokensRes, generationsCountRes, generationsRes, allTransactionsRes, surveyRes] = await Promise.all([
        supabase.from('payments').select('*').eq('user_id', user.id).eq('status', 'succeeded'),
        supabase.from('token_transactions').select('*').eq('user_id', user.id).eq('transaction_type', 'generation'),
        supabase.from('generations').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('generations').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('token_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
        (supabase as any).from('user_survey_responses').select('question_key, answer').eq('user_id', user.id)
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
        tokenTransactions: allTransactionsRes.data || [],
        surveyResponses: surveyRes.data || [],
        utmSourceName
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
      toast({ title: "Ошибка", description: "Не удалось изменить статус пользователя", variant: "destructive" });
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

  return <div className="space-y-6 min-w-0 overflow-hidden">
      {/* Search & Filter */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input placeholder="Поиск по email..." value={searchEmail} onChange={e => setSearchEmail(e.target.value)} className="pl-10" />
          </div>

          <UserFiltersPopover
            filters={filters}
            setFilters={setFilters}
            utmSources={utmSources}
            whoOptions={surveyOptionsByKey.who}
            volumeOptions={surveyOptionsByKey.volume}
            channelOptions={surveyOptionsByKey.channel}
          />
        </div>

        <div className="text-xs text-muted-foreground">
          Найдено: {filteredUsers.length} из {users.length}
        </div>
      </div>

      {/* Users Table */}
      <Card className="bg-card border-border/50 rounded-2xl w-full min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Управление пользователями</CardTitle>
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
                        const activityTimestamp = user.last_active_at ?? user.updated_at;
                        const isActive = new Date(activityTimestamp) > thirtyDaysAgo;
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
                        
                        <ResponsiveDialog>
                          <ResponsiveDialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => {
                              setEditingUser(user);
                              setNewTokenBalance(user.tokens_balance.toString());
                            }} className="h-7 w-7 md:h-8 md:w-8 p-0">
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </ResponsiveDialogTrigger>
                          <ResponsiveDialogContent className="sm:max-w-md">
                            <ResponsiveDialogHeader>
                              <ResponsiveDialogTitle className="text-base md:text-lg">Изменить баланс токенов</ResponsiveDialogTitle>
                              <ResponsiveDialogDescription className="text-xs md:text-sm break-all">
                                Пользователь: {editingUser?.email}
                              </ResponsiveDialogDescription>
                            </ResponsiveDialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="tokens">Новый баланс токенов</Label>
                                <Input id="tokens" type="number" min="0" value={newTokenBalance} onChange={e => setNewTokenBalance(e.target.value)} />
                              </div>
                            </div>
                            <ResponsiveDialogFooter>
                              <Button onClick={updateTokenBalance}>Сохранить</Button>
                            </ResponsiveDialogFooter>
                          </ResponsiveDialogContent>
                        </ResponsiveDialog>

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
      <ResponsiveDialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <ResponsiveDialogContent className="sm:!max-w-4xl lg:!max-w-4xl">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="text-base md:text-lg">Детали пользователя</ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="break-all text-xs md:text-sm">
              {selectedUser?.email}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          {detailsLoading ? <div className="flex justify-center py-8">
              <div className="w-7 h-7 rounded-full border-[2.5px] border-primary/30 border-t-primary animate-[spin_0.7s_linear_infinite]" />
            </div> : userDetails && <div className="space-y-6 w-full min-w-0 overflow-hidden">
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

              {/* UTM Source */}
              <div className="bg-muted/50 rounded-lg p-2.5 sm:p-3 flex items-center gap-2">
                <div className="text-[10px] sm:text-xs text-muted-foreground">Источник:</div>
                <Badge variant="secondary" className="text-xs">
                  {userDetails.utmSourceName || 'Прямой заход'}
                </Badge>
              </div>

              {/* Survey Responses */}
              <div className="space-y-2">
                <h3 className="text-sm sm:text-lg font-semibold">Результаты опроса</h3>
                {userDetails.surveyResponses.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-3">
                    {(() => {
                      const labels: Record<string, string> = {
                        who_are_you: "Кто вы?",
                        monthly_volume: "Объём в месяц",
                        acquisition_channel: "Откуда узнали?"
                      };
                      const order = ["who_are_you", "monthly_volume", "acquisition_channel"];
                      return order.map(key => {
                        const resp = userDetails.surveyResponses.find(r => r.question_key === key);
                        if (!resp) return null;
                        return (
                          <div key={key} className="bg-muted/50 rounded-lg p-2.5 space-y-1">
                            <div className="text-[10px] sm:text-xs text-muted-foreground">{labels[key] || key}</div>
                            <Badge variant="secondary" className="text-xs">{resp.answer}</Badge>
                          </div>
                        );
                      });
                    })()}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Опрос не пройден</p>
                )}
              </div>

              {/* Payment History */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-sm sm:text-lg font-semibold">История платежей</h3>
                <div className="max-h-48 overflow-auto border rounded w-full">
                  <div className="overflow-x-auto w-full">
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
                <div className="max-h-64 overflow-auto border rounded w-full">
                  <div className="overflow-x-auto w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[100px]">Дата</TableHead>
                          <TableHead className="min-w-[80px]">Кол-во</TableHead>
                          <TableHead className="min-w-[100px]">Тип</TableHead>
                          <TableHead className="min-w-[150px]">Описание</TableHead>
                          <TableHead className="min-w-[90px] text-right">Детали</TableHead>
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
                          // Показываем кнопку только для операций, у которых может быть связанная генерация
                          const hasDetails = tx.transaction_type === 'generation';
                          // Скрываем у транзакций старше 30 дней (TTL хранения данных)
                          const ageDays = (Date.now() - new Date(tx.created_at).getTime()) / (1000 * 60 * 60 * 24);
                          const detailsAvailable = hasDetails && ageDays <= 30;
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
                              <TableCell className="text-right">
                                {detailsAvailable ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 gap-1 text-xs"
                                    onClick={() => setSelectedTransaction(tx)}
                                  >
                                    <Info className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Подробнее</span>
                                  </Button>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {userDetails.tokenTransactions.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground text-xs">
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
                {userDetails.referrals.length > 0 ? <div className="max-h-48 overflow-auto border rounded w-full">
                    <div className="overflow-x-auto w-full">
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
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Transaction details popup */}
      <TransactionDetailDialog
        open={!!selectedTransaction}
        onOpenChange={(open) => { if (!open) setSelectedTransaction(null); }}
        transaction={selectedTransaction}
      />

      {/* Survey Statistics */}
      <SurveyStats />
    </div>;
}
