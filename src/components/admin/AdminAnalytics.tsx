import { AdminAnalyticsChart, AdminAdditionalMetrics } from "@/components/dashboard/AdminAnalyticsChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AdminAnalyticsProps {
  users: { id: string; is_blocked: boolean; wb_connected: boolean }[];
}

export function AdminAnalytics({
  users
}: AdminAnalyticsProps) {
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch actual total user count from database
    const fetchTotalUsers = async () => {
      try {
        const { count, error } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true });
        
        if (error) throw error;
        setTotalUsers(count || 0);
      } catch (error) {
        console.error('Error fetching total users:', error);
        setTotalUsers(users.length); // fallback to passed users
      } finally {
        setLoading(false);
      }
    };

    fetchTotalUsers();
  }, [users.length]);

  return <div className="space-y-4 md:space-y-6">
      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-6">
        <AdminAnalyticsChart type="users" />
        <AdminAnalyticsChart type="generations" />
        <AdminAnalyticsChart type="tokens" />
        <AdminAnalyticsChart type="revenue" />
      </div>

      {/* Additional Metrics - Paid users, Average check, Repeat payments (moved below charts) */}
      <AdminAdditionalMetrics />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
        <Card className="bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Пользователей</CardTitle>
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
            <CardTitle className="text-base md:text-lg">Подключений WB</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">
              {users.filter(u => u.wb_connected).length}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">
              {totalUsers > 0 ? (users.filter(u => u.wb_connected).length / totalUsers * 100).toFixed(1) : 0}% пользователей
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Заблокированные</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400">
              {users.filter(u => u.is_blocked).length}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">
              Требуют внимания
            </p>
          </CardContent>
        </Card>
      </div>
    </div>;
}