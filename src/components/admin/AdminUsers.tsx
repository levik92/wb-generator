import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { Label } from "@/components/ui/label";
import { Ban, Pencil, Search, UserCheck, Eye, ChevronLeft, ChevronRight, Info, Coins, Mail, Minus, Plus, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { SurveyStats } from "./SurveyStats";
import { UserDetailDialog } from "./UserDetailDialog";
import { UserFiltersPopover, type UserFiltersState } from "./UserFiltersPopover";

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
        supabase.from('payments').select('*').eq('user_id', user.id).eq('status', 'succeeded').order('created_at', { ascending: false }),
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
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border border-border/60 overflow-hidden">
            <div className="overflow-x-auto max-w-full">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
                    <TableHead className="min-w-[240px] text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">Пользователь</TableHead>
                    <TableHead className="min-w-[80px] text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">Токены</TableHead>
                    <TableHead className="min-w-[80px] text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">Оплата</TableHead>
                    <TableHead className="min-w-[90px] text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">Статус</TableHead>
                    <TableHead className="min-w-[110px] hidden lg:table-cell text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">Регистрация</TableHead>
                    <TableHead className="min-w-[120px] text-right text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentUsers.map((user, idx) => {
                    const isPaid = paidUserIds.has(user.id);
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    const activityTimestamp = user.last_active_at ?? user.updated_at;
                    const isActive = !user.is_blocked && new Date(activityTimestamp) > thirtyDaysAgo;
                    const initial = (user.full_name || user.email || '?').charAt(0).toUpperCase();
                    return (
                      <TableRow
                        key={user.id}
                        className={`group transition-colors hover:bg-primary/5 ${idx % 2 === 1 ? 'bg-muted/20' : ''} ${user.is_blocked ? 'opacity-70' : ''}`}
                      >
                        <TableCell
                          className="cursor-pointer max-w-[280px] py-2.5"
                          onClick={() => { setSelectedUser(user); loadUserDetails(user); }}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-primary/80 to-primary/40 text-primary-foreground flex items-center justify-center text-xs font-semibold uppercase">
                              {initial}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                {user.email}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {user.full_name || 'Имя не указано'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-1.5 py-0.5 text-xs font-semibold tabular-nums">
                            <Coins className="h-3 w-3" />
                            {user.tokens_balance}
                          </div>
                        </TableCell>
                        <TableCell>
                          {paidDataLoading ? (
                            <span className="text-xs text-muted-foreground">…</span>
                          ) : isPaid ? (
                            <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 border-emerald-500/20">Оплачено</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">Нет</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.is_blocked ? (
                            <Badge variant="destructive" className="text-[10px]">Заблокирован</Badge>
                          ) : isActive ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Активен
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                              Неактивен
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground tabular-nums">
                          {new Date(user.created_at).toLocaleDateString('ru-RU')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Подробнее"
                              onClick={() => { setSelectedUser(user); loadUserDetails(user); }}
                              className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              title="Изменить баланс"
                              onClick={() => {
                                setEditingUser(user);
                                setNewTokenBalance(user.tokens_balance.toString());
                              }}
                              className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              title={user.is_blocked ? 'Разблокировать' : 'Заблокировать'}
                              onClick={() => toggleUserBlock(user.id, user.is_blocked)}
                              className={`h-8 w-8 p-0 ${user.is_blocked ? 'text-emerald-600 hover:bg-emerald-500/10' : 'text-destructive hover:bg-red-600 hover:text-white'}`}
                            >
                              {user.is_blocked ? <UserCheck className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-2">
            {currentUsers.map((user) => {
              const isPaid = paidUserIds.has(user.id);
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              const activityTimestamp = user.last_active_at ?? user.updated_at;
              const isActive = !user.is_blocked && new Date(activityTimestamp) > thirtyDaysAgo;
              const initial = (user.full_name || user.email || '?').charAt(0).toUpperCase();
              return (
                <div
                  key={user.id}
                  className={`rounded-xl border border-border/60 bg-card p-3 space-y-2.5 ${user.is_blocked ? 'opacity-70' : ''}`}
                >
                  <div
                    className="flex items-center gap-2.5 min-w-0"
                    onClick={() => { setSelectedUser(user); loadUserDetails(user); }}
                  >
                    <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-primary/80 to-primary/40 text-primary-foreground flex items-center justify-center text-sm font-semibold uppercase">
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{user.email}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {user.full_name || 'Имя не указано'} · {new Date(user.created_at).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-1.5 py-0.5 text-[11px] font-semibold tabular-nums">
                      <Coins className="h-3 w-3" />
                      {user.tokens_balance}
                    </span>
                    {paidDataLoading ? null : isPaid ? (
                      <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 border-emerald-500/20">Оплачено</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Без оплаты</Badge>
                    )}
                    {user.is_blocked ? (
                      <Badge variant="destructive" className="text-[10px]">Блок</Badge>
                    ) : isActive ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Активен
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                        Неактивен
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 pt-1 border-t border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 h-8 text-xs gap-1.5"
                      onClick={() => { setSelectedUser(user); loadUserDetails(user); }}
                    >
                      <Eye className="h-3.5 w-3.5" /> Детали
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 h-8 text-xs gap-1.5"
                      onClick={() => {
                        setEditingUser(user);
                        setNewTokenBalance(user.tokens_balance.toString());
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Баланс
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 w-8 p-0 ${user.is_blocked ? 'text-emerald-600' : 'text-destructive'}`}
                      onClick={() => toggleUserBlock(user.id, user.is_blocked)}
                    >
                      {user.is_blocked ? <UserCheck className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              );
            })}
            {currentUsers.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">Пользователи не найдены</div>
            )}
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

      {/* User Details Modal (with internal drill-down for transaction details) */}
      <UserDetailDialog
        user={selectedUser}
        details={userDetails}
        loading={detailsLoading}
        onClose={() => setSelectedUser(null)}
      />

      {/* Edit Token Balance Dialog (controlled, shared by desktop & mobile) */}
      <ResponsiveDialog
        open={!!editingUser}
        onOpenChange={(open) => {
          if (!open) {
            setEditingUser(null);
            setNewTokenBalance("");
          }
        }}
      >
        <ResponsiveDialogContent className="sm:max-w-md p-0 overflow-hidden">
          <div
            className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-border/60 bg-[radial-gradient(ellipse_60%_50%_at_0%_100%,hsl(var(--primary)/0.18),transparent_70%),radial-gradient(ellipse_60%_50%_at_100%_100%,hsl(var(--primary)/0.18),transparent_70%)]"
          >
            <ResponsiveDialogHeader className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Coins className="h-4 w-4" />
                </div>
                <ResponsiveDialogTitle className="text-base sm:text-lg">
                  Изменить баланс
                </ResponsiveDialogTitle>
              </div>
              <ResponsiveDialogDescription className="text-xs sm:text-sm flex items-center gap-1.5 break-all">
                <Mail className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{editingUser?.email}</span>
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
          </div>

          <div className="px-5 sm:px-6 py-4 space-y-4">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
              <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2.5 text-center">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Текущий</div>
                <div className="text-base sm:text-lg font-semibold tabular-nums">
                  {editingUser?.tokens_balance ?? 0}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-center">
                <div className="text-[10px] uppercase tracking-wide text-primary/80 mb-0.5">Новый</div>
                <div className="text-base sm:text-lg font-semibold tabular-nums text-primary">
                  {newTokenBalance === '' || isNaN(parseInt(newTokenBalance)) ? '—' : parseInt(newTokenBalance)}
                </div>
              </div>
            </div>

            {(() => {
              const cur = editingUser?.tokens_balance ?? 0;
              const next = parseInt(newTokenBalance);
              if (isNaN(next) || next === cur) return null;
              const diff = next - cur;
              const positive = diff > 0;
              return (
                <div className="flex justify-center">
                  <Badge
                    variant="secondary"
                    className={`text-xs font-medium ${positive ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/15 text-red-600 dark:text-red-400'}`}
                  >
                    {positive ? '+' : ''}{diff} токенов
                  </Badge>
                </div>
              );
            })()}

            <div className="space-y-2">
              <Label htmlFor="tokens" className="text-xs text-muted-foreground">Новый баланс</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => {
                    const cur = parseInt(newTokenBalance) || 0;
                    setNewTokenBalance(String(Math.max(0, cur - 10)));
                  }}
                  aria-label="Уменьшить на 10"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="tokens"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={newTokenBalance}
                  onChange={(e) => setNewTokenBalance(e.target.value)}
                  onFocus={(e) => {
                    setTimeout(() => {
                      e.target.scrollIntoView({ block: "center", behavior: "smooth" });
                    }, 300);
                  }}
                  className="h-10 text-center text-base font-semibold tabular-nums"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => {
                    const cur = parseInt(newTokenBalance) || 0;
                    setNewTokenBalance(String(cur + 10));
                  }}
                  aria-label="Увеличить на 10"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Быстро прибавить</div>
              <div className="grid grid-cols-4 gap-1.5">
                {[50, 100, 250, 500].map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      const cur = parseInt(newTokenBalance) || 0;
                      setNewTokenBalance(String(cur + n));
                    }}
                  >
                    +{n}
                  </Button>
                ))}
              </div>
            </div>

          </div>

          <ResponsiveDialogFooter className="px-5 sm:px-6 pb-5 sm:pb-6 pt-2 gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewTokenBalance(String(editingUser?.tokens_balance ?? 0))}
              className="sm:order-1"
            >
              Сбросить
            </Button>
            <Button onClick={updateTokenBalance} className="sm:order-2">
              Сохранить
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Survey Statistics */}
      <SurveyStats />
    </div>;
}
