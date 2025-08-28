import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-picker-range";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Area, AreaChart } from "recharts";
import { CalendarDays, TrendingUp, Download, DollarSign, Activity } from "lucide-react";
import { DateRange } from "react-day-picker";

export default function AdminAnalytics() {
  const [period, setPeriod] = useState("7d");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [generationsData, setGenerationsData] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalGenerations, setTotalGenerations] = useState(0);
  const [revenueGrowth, setRevenueGrowth] = useState(0);
  const [generationsGrowth, setGenerationsGrowth] = useState(0);

  // Load analytics data from server
  useEffect(() => {
    const loadAnalyticsData = async () => {
      try {
        // Get date range based on period selection
        let startDate, endDate = new Date();
        
        if (period === "custom" && dateRange?.from && dateRange?.to) {
          startDate = dateRange.from;
          endDate = dateRange.to;
        } else {
          const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
          startDate = new Date();
          startDate.setDate(startDate.getDate() - days);
        }

        // Format dates for API
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        // TODO: Replace with actual API calls to your server
        // Example API calls:
        // const revenueResponse = await fetch(`/api/analytics/revenue?start=${startDateStr}&end=${endDateStr}`);
        // const generationsResponse = await fetch(`/api/analytics/generations?start=${startDateStr}&end=${endDateStr}`);
        
        // For now, generate mock data based on period
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const revenue = [];
        const generations = [];

        for (let i = 0; i < days; i++) {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);
          const dateStr = date.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' });

          const revenueAmount = Math.floor(Math.random() * 50000) + 10000;
          const generationsCount = Math.floor(Math.random() * 200) + 50;

          revenue.push({
            date: dateStr,
            amount: revenueAmount,
          });

          generations.push({
            date: dateStr,
            count: generationsCount,
          });
        }

        setRevenueData(revenue);
        setGenerationsData(generations);
        
        // Calculate totals and growth
        const revenueTotal = revenue.reduce((sum, item) => sum + item.amount, 0);
        const generationsTotal = generations.reduce((sum, item) => sum + item.count, 0);
        
        setTotalRevenue(revenueTotal);
        setTotalGenerations(generationsTotal);
        
        // Calculate growth (comparing last period vs previous period)
        const midPoint = Math.floor(revenue.length / 2);
        const firstHalf = revenue.slice(0, midPoint);
        const secondHalf = revenue.slice(midPoint);
        
        const firstHalfRevenue = firstHalf.reduce((sum, item) => sum + item.amount, 0);
        const secondHalfRevenue = secondHalf.reduce((sum, item) => sum + item.amount, 0);
        
        const firstHalfGenerations = generations.slice(0, midPoint).reduce((sum, item) => sum + item.count, 0);
        const secondHalfGenerations = generations.slice(midPoint).reduce((sum, item) => sum + item.count, 0);
        
        const revGrowth = firstHalfRevenue > 0 ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100 : 0;
        const genGrowth = firstHalfGenerations > 0 ? ((secondHalfGenerations - firstHalfGenerations) / firstHalfGenerations) * 100 : 0;
        
        setRevenueGrowth(revGrowth);
        setGenerationsGrowth(genGrowth);
      } catch (error) {
        console.error('Error loading analytics data:', error);
      }
    };

    loadAnalyticsData();
  }, [period, dateRange]);

  const exportData = () => {
    // Simulate export functionality
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Date,Revenue,Generations\n" +
      revenueData.map((item, index) => 
        `${item.date},${item.amount},${generationsData[index]?.count || 0}`
      ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `analytics_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Revenue Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общий доход</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₽{totalRevenue.toLocaleString('ru-RU')}</div>
            <p className={`text-xs ${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}% от предыдущего периода
            </p>
          </CardContent>
        </Card>

        {/* Generations Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего генераций</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGenerations.toLocaleString('ru-RU')}</div>
            <p className={`text-xs ${generationsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {generationsGrowth >= 0 ? '+' : ''}{generationsGrowth.toFixed(1)}% от предыдущего периода
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4 items-center">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Последняя неделя</SelectItem>
              <SelectItem value="30d">Последний месяц</SelectItem>
              <SelectItem value="90d">Последние 3 месяца</SelectItem>
              <SelectItem value="custom">Выбранный период</SelectItem>
            </SelectContent>
          </Select>

          {period === "custom" && (
            <DatePickerWithRange
              date={dateRange}
              onDateChange={setDateRange}
              className="w-72"
            />
          )}
        </div>

        <Button onClick={exportData} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Экспорт данных
        </Button>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Доходы за период
          </CardTitle>
          <CardDescription>
            Динамика доходов с трендом роста
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  className="text-muted-foreground"
                />
                <YAxis 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `₽${(value / 1000).toFixed(0)}k`}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  formatter={(value) => [`₽${value.toLocaleString('ru-RU')}`, 'Доход']}
                  labelFormatter={(label) => `Дата: ${label}`}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  fill="url(#revenueGradient)"
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Generations Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Количество генераций
          </CardTitle>
          <CardDescription>
            Статистика выполненных генераций по дням
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={generationsData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  className="text-muted-foreground"
                />
                <YAxis 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  formatter={(value) => [value, 'Генерации']}
                  labelFormatter={(label) => `Дата: ${label}`}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--chart-2))", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: "hsl(var(--chart-2))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}