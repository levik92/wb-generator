import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, TrendingUp, DollarSign, Gift } from "lucide-react";

interface RevenueData {
  date: string;
  revenue: number;
  tokens_sold: number;
  payments_count: number;
}

export const AdminAnalyticsChart = () => {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [period, setPeriod] = useState("7d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRevenueData();
  }, [period]);

  const loadRevenueData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range based on period
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      // Get payment data
      const { data: payments, error } = await supabase
        .from('payments')
        .select('created_at, amount, tokens_amount, status')
        .eq('status', 'succeeded')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by date
      const groupedData: { [key: string]: RevenueData } = {};
      
      // Initialize all dates in range with 0 values
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        groupedData[dateKey] = {
          date: dateKey,
          revenue: 0,
          tokens_sold: 0,
          payments_count: 0
        };
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Fill with actual data
      payments?.forEach(payment => {
        const dateKey = payment.created_at.split('T')[0];
        if (groupedData[dateKey]) {
          groupedData[dateKey].revenue += parseFloat(payment.amount.toString());
          groupedData[dateKey].tokens_sold += payment.tokens_amount;
          groupedData[dateKey].payments_count += 1;
        }
      });

      const result = Object.values(groupedData).map(item => ({
        ...item,
        revenue: Math.round(item.revenue * 100) / 100, // Round to 2 decimal places
        date: new Date(item.date).toLocaleDateString('ru-RU', { 
          day: '2-digit', 
          month: '2-digit' 
        })
      }));

      setRevenueData(result);
    } catch (error) {
      console.error('Error loading revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const totalTokens = revenueData.reduce((sum, item) => sum + item.tokens_sold, 0);
  const totalPayments = revenueData.reduce((sum, item) => sum + item.payments_count, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Аналитика доходов</h3>
          <p className="text-muted-foreground">
            Статистика доходов и продаж токенов
          </p>
        </div>
        
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 дней</SelectItem>
            <SelectItem value="30d">30 дней</SelectItem>
            <SelectItem value="90d">90 дней</SelectItem>
            <SelectItem value="1y">1 год</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общий доход</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              За выбранный период
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Продано токенов</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {totalTokens.toLocaleString('ru-RU')}
            </div>
            <p className="text-xs text-muted-foreground">
              Общее количество
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Количество платежей</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {totalPayments}
            </div>
            <p className="text-xs text-muted-foreground">
              Успешных транзакций
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>График доходов</CardTitle>
          <CardDescription>
            Динамика доходов по дням в рублях
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-80 flex items-center justify-center">
              <p className="text-muted-foreground">Загрузка данных...</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tickFormatter={formatCurrency}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Доход']}
                  labelFormatter={(label) => `Дата: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Tokens Chart */}
      <Card>
        <CardHeader>
          <CardTitle>График продаж токенов</CardTitle>
          <CardDescription>
            Количество проданных токенов по дням
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-80 flex items-center justify-center">
              <p className="text-muted-foreground">Загрузка данных...</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: number) => [value.toLocaleString('ru-RU'), 'Токенов']}
                  labelFormatter={(label) => `Дата: ${label}`}
                />
                <Bar 
                  dataKey="tokens_sold" 
                  fill="#3b82f6" 
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};