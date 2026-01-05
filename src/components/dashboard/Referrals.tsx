import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Users, ExternalLink, Link2, Calendar, Gift } from "lucide-react";
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
export const Referrals = ({
  profile
}: ReferralsProps) => {
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const {
    toast
  } = useToast();
  const referralLink = `${window.location.origin}/auth?ref=${profile.referral_code}`;
  useEffect(() => {
    loadReferredUsers();
  }, [profile.id]);
  const loadReferredUsers = async () => {
    try {
      setLoading(true);
      // Get referrals data
      const {
        data: referrals,
        error
      } = await supabase.from('referrals').select(`
          *,
          referred:profiles!referred_id(email)
        `).eq('referrer_id', profile.id).order('created_at', {
        ascending: false
      });
      if (error) throw error;

      // Get completed referrals
      const {
        data: completed,
        error: completedError
      } = await supabase.from('referrals_completed').select('*').eq('referrer_id', profile.id);
      if (completedError) throw completedError;

      // Combine data
      const combinedData = referrals?.map(ref => {
        const completedRef = completed?.find(c => c.referred_id === ref.referred_id);
        return {
          id: ref.id,
          created_at: ref.created_at,
          status: completedRef ? 'completed' : ref.status,
          tokens_awarded: completedRef?.tokens_awarded || ref.tokens_awarded,
          referred_user_email: ref.referred?.email || 'Пользователь'
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
    toast({
      title: "Ссылка скопирована!",
      description: "Поделитесь ей с друзьями"
    });
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  return <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Реферальная программа</h2>
        <p className="text-muted-foreground text-sm">
          Приглашайте друзей и получайте бонусы
        </p>
      </div>

      <Tabs defaultValue="program" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 bg-background p-1 rounded-xl border border-border/50">
          <TabsTrigger value="program" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Программа</TabsTrigger>
          <TabsTrigger value="invited" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Приглашенные <span className="ml-1 opacity-70">({referredUsers.length})</span></TabsTrigger>
        </TabsList>

        <TabsContent value="program" className="space-y-6">
          <Card className="border border-border/50 bg-zinc-50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-muted p-3 rounded-lg">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold text-foreground">Реферальная программа</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Приглашайте друзей и получайте бонусы
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-secondary/30 border border-border/50 rounded-[12px] p-6 shadow-sm">
                <h3 className="font-medium mb-4 text-foreground flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Ваша реферальная ссылка:
                </h3>
                <div className="flex gap-2">
                  <Input value={referralLink} readOnly className="flex-1 bg-background/80" />
                  <Button onClick={copyReferralLink} variant="outline" className="px-4 bg-wb-purple/10 border-wb-purple/30 text-wb-purple hover:bg-wb-purple/20 hover:text-wb-purple dark:bg-wb-purple/20 dark:border-wb-purple/40 dark:text-wb-purple-light dark:hover:bg-wb-purple/30">
                    <Copy className="h-4 w-4 mr-2" />
                    Копировать
                  </Button>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-500/10 border-green-500/30 dark:bg-green-500/15 dark:border-green-500/30 rounded-xl shadow-sm border">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">+20</div>
                  <div className="text-sm text-green-700 dark:text-green-300 font-medium">токенов за первую покупку друга</div>
                </div>
                <div className="text-center p-4 bg-blue-500/10 border-blue-500/30 dark:bg-blue-500/15 dark:border-blue-500/30 rounded-xl shadow-sm border">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">+10</div>
                  <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">токенов другу при регистрации</div>
                </div>
              </div>
              
              <div className="bg-muted/40 p-4 rounded-lg border text-sm text-muted-foreground">
                <strong>Как это работает:</strong> Ваш друг получает +10 токенов сразу при регистрации (итого 25 токенов). 
                Вы получаете +20 токенов только после его первого пополнения баланса.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invited" className="space-y-4">
          <Card className="border border-border/50 bg-zinc-50">
            <CardHeader>
              <CardTitle>Приглашенные пользователи</CardTitle>
              <CardDescription>
                Список всех пользователей, зарегистрировавшихся по вашей ссылке
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <div className="text-center py-8">
                  <p className="text-muted-foreground">Загрузка...</p>
                </div> : referredUsers.length === 0 ? <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Пока никто не зарегистрировался</h3>
                  <p className="text-muted-foreground">Поделитесь своей реферальной ссылкой с друзьями</p>
                </div> : <div className="space-y-3">
                  {referredUsers.map(user => <div key={user.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">{user.referred_user_email}</div>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(user.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {user.status === 'completed' && user.tokens_awarded ? <Badge className="bg-green-500/10 text-green-700 border-green-500/20 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30">
                            <Gift className="w-3 h-3 mr-1" />
                            +{user.tokens_awarded} токенов
                          </Badge> : <Badge variant="secondary">
                            Ожидает покупки
                          </Badge>}
                      </div>
                    </div>)}
                </div>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>;
};