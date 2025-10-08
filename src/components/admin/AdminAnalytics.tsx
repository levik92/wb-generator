import { AdminAnalyticsChart } from "@/components/dashboard/AdminAnalyticsChart";
import { PromoCodeManager } from "@/components/dashboard/PromoCodeManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

interface AdminAnalyticsProps {
  users: User[];
}

export function AdminAnalytics({ users }: AdminAnalyticsProps) {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-6">
        <AdminAnalyticsChart type="users" />
        <AdminAnalyticsChart type="generations" />
        <AdminAnalyticsChart type="tokens" />
        <AdminAnalyticsChart type="revenue" />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Активные пользователи</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl md:text-3xl font-bold text-green-600">
              {users.filter(u => !u.is_blocked).length}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">
              {users.length > 0 ? ((users.filter(u => !u.is_blocked).length / users.length) * 100).toFixed(1) : 0}% от общего числа
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Подключений WB</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl md:text-3xl font-bold text-blue-600">
              {users.filter(u => u.wb_connected).length}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">
              {users.length > 0 ? ((users.filter(u => u.wb_connected).length / users.length) * 100).toFixed(1) : 0}% пользователей
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Заблокированные</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl md:text-3xl font-bold text-red-600">
              {users.filter(u => u.is_blocked).length}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">
              Требуют внимания
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Promo Codes Management */}
      <PromoCodeManager />
    </div>
  );
}