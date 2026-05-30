import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Users, Link2, Calendar, Gift, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  tokens_balance: number;
  wb_connected: boolean;
  referral_code: string;
}
interface ReferredUser {
  id: string;
  created_at: string;
  status: string;
  tokens_awarded?: number;
  referred_user_email?: string;
}
interface ReferralsProps {
  profile: Profile;
}

export const Referrals = ({ profile }: ReferralsProps) => {
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const referralLink = `${window.location.origin}/auth?ref=${profile.referral_code}`;

  useEffect(() => {
    loadReferredUsers();
  }, [profile.id]);

  const loadReferredUsers = async () => {
    try {
      setLoading(true);
      const { data: referrals, error } = await supabase
        .from('referrals')
        .select(`*, referred:profiles!referred_id(email)`)
        .eq('referrer_id', profile.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const { data: completed, error: completedError } = await supabase
        .from('referrals_completed')
        .select('*')
        .eq('referrer_id', profile.id);
      if (completedError) throw completedError;

      const combinedData = referrals?.map(ref => {
        const completedRef = completed?.find(c => c.referred_id === ref.referred_id);
        return {
          id: ref.id,
          created_at: ref.created_at,
          status: completedRef ? 'completed' : ref.status,
          tokens_awarded: completedRef?.tokens_awarded || ref.tokens_awarded,
          referred_user_email: ref.referred?.email || 'Пользователь',
        };
      }) || [];
      setReferredUsers(combinedData);
    } catch (error: any) {
      console.error('Error loading referrals:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Ссылка скопирована!", description: "Поделитесь ей с друзьями" });
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

  const completedCount = referredUsers.filter(u => u.status === 'completed').length;
  const totalReferralTokens = referredUsers.reduce((s, u) => s + (u.tokens_awarded || 0), 0);

  return (
    <div className="space-y-5">
      <Tabs defaultValue="program" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-xl border border-border/50 h-auto">
          <TabsTrigger value="program" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm py-2">
            Программа
          </TabsTrigger>
          <TabsTrigger value="invited" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm py-2">
            Приглашённые
            <span className="ml-1.5 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary/15 text-primary text-[10px] font-semibold">
              {referredUsers.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="program" className="space-y-4 mt-4">
          {/* Hero */}
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-blue-500/5 to-transparent px-4 py-5 sm:px-6 sm:py-6">
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-16 w-56 h-56 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

            <div className="relative flex flex-col gap-5">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-lg font-semibold leading-tight">Реферальная программа</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Приглашайте друзей — получайте по 15 токенов за каждого оплатившего
                  </p>
                </div>
              </div>

              {/* Referral link */}
              <div>
                <div className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Link2 className="h-3 w-3" />
                  Ваша реферальная ссылка
                </div>
                <div className="flex gap-2">
                  <Input
                    value={referralLink}
                    readOnly
                    className="flex-1 bg-background/80 border-border/60 text-xs sm:text-sm font-mono h-10"
                  />
                  <Button
                    onClick={copyReferralLink}
                    className="h-10 px-3 sm:px-4 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                  >
                    <Copy className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Копировать</span>
                  </Button>
                </div>
              </div>

              {/* Rewards */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-3 sm:px-4">
                  <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 leading-none">+15</div>
                  <div className="text-[11px] sm:text-xs text-emerald-700/80 dark:text-emerald-300/80 font-medium mt-1.5 leading-tight">
                    токенов вам после первой оплаты друга
                  </div>
                </div>
                <div className="rounded-xl border border-blue-500/25 bg-blue-500/5 px-3 py-3 sm:px-4">
                  <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 leading-none">+15</div>
                  <div className="text-[11px] sm:text-xs text-blue-700/80 dark:text-blue-300/80 font-medium mt-1.5 leading-tight">
                    токенов другу после его первой оплаты
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-xl border border-border/50 bg-card px-3 py-3">
              <div className="text-[10px] sm:text-xs text-muted-foreground">Приглашено</div>
              <div className="text-base sm:text-lg font-semibold mt-0.5">{referredUsers.length}</div>
            </div>
            <div className="rounded-xl border border-border/50 bg-card px-3 py-3">
              <div className="text-[10px] sm:text-xs text-muted-foreground">Оплатили</div>
              <div className="text-base sm:text-lg font-semibold mt-0.5">{completedCount}</div>
            </div>
            <div className="rounded-xl border border-border/50 bg-card px-3 py-3">
              <div className="text-[10px] sm:text-xs text-muted-foreground">Заработано</div>
              <div className="text-base sm:text-lg font-semibold text-primary mt-0.5">+{totalReferralTokens}</div>
            </div>
          </div>

          {/* How it works */}
          <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
            <div className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />
              Как это работает
            </div>
            <ol className="space-y-1.5 text-xs sm:text-sm text-muted-foreground list-decimal list-inside leading-relaxed">
              <li>Скопируйте свою реферальную ссылку</li>
              <li>Поделитесь с друзьями, коллегами или подписчиками</li>
              <li>После первой оплаты друга вы оба получаете по 15 токенов</li>
            </ol>
          </div>
        </TabsContent>

        <TabsContent value="invited" className="space-y-3 mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 rounded-full border-[2.5px] border-primary/30 border-t-primary animate-[spin_0.7s_linear_infinite]" />
            </div>
          ) : referredUsers.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-border/60 bg-muted/20">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Users className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-base font-semibold mb-1">Пока никто не зарегистрировался</h3>
              <p className="text-sm text-muted-foreground px-6">
                Поделитесь реферальной ссылкой — и первый бонус не заставит себя ждать
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {referredUsers.map(user => {
                const isCompleted = user.status === 'completed' && user.tokens_awarded;
                const initial = (user.referred_user_email?.[0] || 'U').toUpperCase();
                return (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between gap-3 p-3 sm:p-4 rounded-xl border transition-colors ${
                      isCompleted
                        ? 'border-emerald-500/25 bg-emerald-500/5'
                        : 'border-border/50 bg-card hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-semibold ${
                        isCompleted
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25'
                          : 'bg-primary/10 text-primary border border-primary/20'
                      }`}>
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{user.referred_user_email}</div>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(user.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {isCompleted ? (
                        <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                          <Gift className="w-3 h-3" />
                          +{user.tokens_awarded}
                        </div>
                      ) : (
                        <div className="inline-flex items-center rounded-full bg-muted border border-border/50 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                          Ожидает оплаты
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
