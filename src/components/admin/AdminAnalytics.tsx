import { AdminAnalyticsChart, AdminAdditionalMetrics } from "@/components/dashboard/AdminAnalyticsChart";
import { AdminBreakdownChart } from "@/components/dashboard/AdminBreakdownChart";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Users, Activity } from "lucide-react";
import { StatCard } from "@/components/dashboard/GlassCard";
import { motion } from "framer-motion";

interface AdminAnalyticsProps {
  users: { id: string; is_blocked: boolean; wb_connected: boolean }[];
}

export function AdminAnalytics({ users }: AdminAnalyticsProps) {
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [paidUsersCount, setPaidUsersCount] = useState<number>(0);
  const [repeatPaidCount, setRepeatPaidCount] = useState<number>(0);
  const [activeUsersCount, setActiveUsersCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { count: totalCount } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true });
        setTotalUsers(totalCount || 0);

        const { data: paidData } = await supabase
          .from('payments')
          .select('user_id')
          .eq('status', 'succeeded');
        
        const paidUserIds = new Set((paidData || []).map(p => p.user_id));
        setPaidUsersCount(paidUserIds.size);

        const paymentCounts: Record<string, number> = {};
        (paidData || []).forEach(p => {
          paymentCounts[p.user_id] = (paymentCounts[p.user_id] || 0) + 1;
        });
        const repeatCount = Object.values(paymentCounts).filter(c => c >= 2).length;
        setRepeatPaidCount(repeatCount);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

        const { count: recentLoginCount } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('updated_at', thirtyDaysAgoISO);

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

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Analytics Charts */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-6"
      >
        <AdminAnalyticsChart type="users" />
        <AdminBreakdownChart type="generations" />
        <AdminBreakdownChart type="tokens" />
        <AdminAnalyticsChart type="revenue" />
      </motion.div>

      {/* Additional Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        <AdminAdditionalMetrics />
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Всего пользователей"
          value={loading ? '...' : totalUsers.toLocaleString('ru-RU')}
          delay={0}
        />
        <StatCard
          icon={<CreditCard className="w-5 h-5" />}
          label="Платные пользователи"
          value={loading ? '...' : paidUsersCount.toLocaleString('ru-RU')}
          trend={paidUsersCount > 0 ? `${repeatPaidCount} повт.` : undefined}
          trendUp={repeatPaidCount > 0}
          delay={0.1}
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Активные (30 дней)"
          value={loading ? '...' : activeUsersCount.toLocaleString('ru-RU')}
          trend={totalUsers > 0 ? `${(activeUsersCount / totalUsers * 100).toFixed(1)}%` : undefined}
          trendUp={true}
          delay={0.2}
        />
      </div>
    </div>
  );
}
