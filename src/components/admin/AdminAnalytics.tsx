import { AdminAnalyticsChart, AdminAdditionalMetrics } from "@/components/dashboard/AdminAnalyticsChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Users, Activity } from "lucide-react";

interface AdminAnalyticsProps {
  users: { id: string; is_blocked: boolean; wb_connected: boolean }[];
}

export function AdminAnalytics({
  users
}: AdminAnalyticsProps) {
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [paidUsersCount, setPaidUsersCount] = useState<number>(0);
  const [repeatPaidCount, setRepeatPaidCount] = useState<number>(0);
  const [activeUsersCount, setActiveUsersCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Total users
        const { count: totalCount } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true });
        setTotalUsers(totalCount || 0);

        // Paid users: distinct user_ids with succeeded payments
        const { data: paidData } = await supabase
          .from('payments')
          .select('user_id')
          .eq('status', 'succeeded');
        
        const paidUserIds = new Set((paidData || []).map(p => p.user_id));
        setPaidUsersCount(paidUserIds.size);

        // Repeat paid users: users with 2+ succeeded payments
        const paymentCounts: Record<string, number> = {};
        (paidData || []).forEach(p => {
          paymentCounts[p.user_id] = (paymentCounts[p.user_id] || 0) + 1;
        });
        const repeatCount = Object.values(paymentCounts).filter(c => c >= 2).length;
        setRepeatPaidCount(repeatCount);

        // Active users: logged in or spent tokens in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

        // Active users: use count queries + paginated token transactions to avoid 1000 row limit
        // Count profiles updated in last 30 days
        const { count: recentLoginCount } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('updated_at', thirtyDaysAgoISO);

        // Get distinct user_ids from token_transactions (paginated to avoid 1000 limit)
        const tokenUserIds = new Set<string>();
        let offset = 0;
        const pageSize = 1000;
        let hasMore = true;
        while (hasMore) {
          const { data: tokenPage } = await supabase
            .from('token_transactions')
            .select('user_id')
            .eq('transaction_type', 'generation')
            .gte('created_at', thirtyDaysAgoISO)
            .range(offset, offset + pageSize - 1);
          if (tokenPage && tokenPage.length > 0) {
            tokenPage.forEach(t => tokenUserIds.add(t.user_id));
            offset += pageSize;
            hasMore = tokenPage.length === pageSize;
          } else {
            hasMore = false;
          }
        }

        // Best estimate: max of login count and token users (they overlap)
        // recentLoginCount already counts all via head:true (no 1000 limit)
        const activeEstimate = Math.max(recentLoginCount || 0, tokenUserIds.size);
        setActiveUsersCount(activeEstimate);
      } catch (error) {
        console.error('Error fetching analytics stats:', error);
        setTotalUsers(users.length);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [users.length]);

  return <div className="space-y-4 md:space-y-6">
      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-6">
        <AdminAnalyticsChart type="users" />
        <AdminAnalyticsChart type="generations" />
        <AdminAnalyticsChart type="tokens" />
        <AdminAnalyticsChart type="revenue" />
      </div>

      {/* Additional Metrics */}
      <AdminAdditionalMetrics />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
        <Card className="bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Пользователей
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
              {loading ? '...' : totalUsers.toLocaleString('ru-RU')}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">
              Всего на платформе
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              Платные пользователи
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">
              {loading ? '...' : paidUsersCount.toLocaleString('ru-RU')}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">
              Повторно: {loading ? '...' : repeatPaidCount.toLocaleString('ru-RU')} ({paidUsersCount > 0 ? (repeatPaidCount / paidUsersCount * 100).toFixed(1) : 0}%)
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Активные пользователи
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {loading ? '...' : activeUsersCount.toLocaleString('ru-RU')}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">
              {totalUsers > 0 ? (activeUsersCount / totalUsers * 100).toFixed(1) : 0}% от всех (30 дней)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>;
}
