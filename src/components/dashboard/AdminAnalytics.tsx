import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-picker-range";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { CalendarDays, TrendingUp, Download } from "lucide-react";
import { DateRange } from "react-day-picker";

export default function AdminAnalytics() {
  const [period, setPeriod] = useState("7d");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [generationsData, setGenerationsData] = useState<any[]>([]);

  // Mock data - replace with real API calls
  useEffect(() => {
    // Simulate API call based on period
    const generateMockData = () => {
      const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
      const revenue = [];
      const generations = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' });

        revenue.push({
          date: dateStr,
          amount: Math.floor(Math.random() * 50000) + 10000,
        });

        generations.push({
          date: dateStr,
          count: Math.floor(Math.random() * 200) + 50,
        });
      }

      setRevenueData(revenue);
      setGenerationsData(generations);
    };

    generateMockData();
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
            Доходы
          </CardTitle>
          <CardDescription>
            Динамика доходов за выбранный период
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `₽${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value) => [`₽${value.toLocaleString('ru-RU')}`, 'Доход']}
                  labelFormatter={(label) => `Дата: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
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
            Количество выполненных генераций за период
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={generationsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  formatter={(value) => [value, 'Генерации']}
                  labelFormatter={(label) => `Дата: ${label}`}
                />
                <Bar 
                  dataKey="count" 
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}