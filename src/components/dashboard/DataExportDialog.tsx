import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet, Users, Bot, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import Papa from 'papaparse';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  tokens_balance: number;
  wb_connected: boolean;
  is_blocked: boolean;
  created_at: string;
  referral_code: string;
  referred_by: string | null;
}

interface Prompt {
  id: string;
  prompt_type: string;
  prompt_template: string;
  created_at: string;
  updated_at: string;
}

interface AnalyticsData {
  period: string;
  charts: {
    users: Array<{ date: string; value: number }>;
    generations: Array<{ date: string; value: number }>;
    tokens: Array<{ date: string; value: number }>;
    revenue: Array<{ date: string; value: number }>;
  };
  totals: {
    users: number;
    generations: number;
    tokens: number;
    revenue: number;
  };
}

interface DataExportDialogProps {
  children: React.ReactNode;
}

export function DataExportDialog({ children }: DataExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadAllData();
    }
  }, [open]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Загружаем пользователей
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Загружаем промпты
      const { data: promptsData, error: promptsError } = await supabase
        .from('ai_prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (promptsError) throw promptsError;
      setPrompts(promptsData || []);

      // Загружаем аналитику
      const { data: analyticsData, error: analyticsError } = await supabase.functions.invoke('admin-analytics', {
        body: { period: 'month' }
      });

      if (analyticsError) throw analyticsError;
      setAnalytics(analyticsData);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные для экспорта",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportUsersToCSV = () => {
    const csvData = users.map(user => ({
      'ID': user.id,
      'Email': user.email,
      'Имя': user.full_name || 'Не указано',
      'Баланс токенов': user.tokens_balance,
      'WB подключен': user.wb_connected ? 'Да' : 'Нет',
      'Заблокирован': user.is_blocked ? 'Да' : 'Нет',
      'Реферальный код': user.referral_code,
      'Приглашен кем-то': user.referred_by ? 'Да' : 'Нет',
      'Дата регистрации': new Date(user.created_at).toLocaleDateString('ru-RU')
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: "Успешно",
      description: "Данные пользователей экспортированы",
    });
  };

  const exportPromptsToCSV = () => {
    const csvData = prompts.map(prompt => ({
      'ID': prompt.id,
      'Тип промпта': prompt.prompt_type,
      'Шаблон промпта': prompt.prompt_template,
      'Дата создания': new Date(prompt.created_at).toLocaleDateString('ru-RU'),
      'Дата обновления': new Date(prompt.updated_at).toLocaleDateString('ru-RU')
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `prompts_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: "Успешно",
      description: "Данные промптов экспортированы",
    });
  };

  const exportAnalyticsToCSV = () => {
    if (!analytics) return;

    // Создаем данные аналитики
    const maxLength = Math.max(
      analytics.charts.users.length,
      analytics.charts.generations.length,
      analytics.charts.tokens.length,
      analytics.charts.revenue.length
    );

    const csvData = [];
    for (let i = 0; i < maxLength; i++) {
      csvData.push({
        'Дата': analytics.charts.users[i]?.date || '',
        'Пользователи': analytics.charts.users[i]?.value || 0,
        'Генерации': analytics.charts.generations[i]?.value || 0,
        'Потраченные токены': analytics.charts.tokens[i]?.value || 0,
        'Доход (руб)': analytics.charts.revenue[i]?.value || 0
      });
    }

    // Добавляем итоговые значения
    csvData.push({
      'Дата': 'ИТОГО',
      'Пользователи': analytics.totals.users,
      'Генерации': analytics.totals.generations,
      'Потраченные токены': analytics.totals.tokens,
      'Доход (руб)': analytics.totals.revenue
    });

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: "Успешно",
      description: "Данные аналитики экспортированы",
    });
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Экспорт данных</DialogTitle>
            <DialogDescription>
              Загрузка данных для экспорта...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Экспорт данных</DialogTitle>
          <DialogDescription>
            Просмотр и экспорт данных системы в формате таблиц
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Пользователи
            </TabsTrigger>
            <TabsTrigger value="prompts" className="gap-2">
              <Bot className="h-4 w-4" />
              Промпты
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Аналитика
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Пользователи системы</h3>
                <p className="text-sm text-muted-foreground">Всего пользователей: {users.length}</p>
              </div>
              <Button onClick={exportUsersToCSV} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Экспорт CSV
              </Button>
            </div>
            
            <Card>
              <CardContent className="p-0">
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Имя</TableHead>
                        <TableHead>Токены</TableHead>
                        <TableHead>WB</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Дата регистрации</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.slice(0, 100).map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.email}</TableCell>
                          <TableCell>{user.full_name || 'Не указано'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{user.tokens_balance}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.wb_connected ? "default" : "secondary"}>
                              {user.wb_connected ? 'Подключен' : 'Не подключен'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.is_blocked ? "destructive" : "default"}>
                              {user.is_blocked ? 'Заблокирован' : 'Активен'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(user.created_at).toLocaleDateString('ru-RU')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {users.length > 100 && (
                  <div className="p-4 text-center text-sm text-muted-foreground border-t">
                    Показано 100 из {users.length} пользователей. Полный список доступен в CSV экспорте.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prompts" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Промпты системы</h3>
                <p className="text-sm text-muted-foreground">Всего промптов: {prompts.length}</p>
              </div>
              <Button onClick={exportPromptsToCSV} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Экспорт CSV
              </Button>
            </div>
            
            <Card>
              <CardContent className="p-0">
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Тип промпта</TableHead>
                        <TableHead>Шаблон</TableHead>
                        <TableHead>Создан</TableHead>
                        <TableHead>Обновлен</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prompts.map((prompt) => (
                        <TableRow key={prompt.id}>
                          <TableCell className="font-medium">{prompt.prompt_type}</TableCell>
                          <TableCell className="max-w-md truncate">
                            {prompt.prompt_template}
                          </TableCell>
                          <TableCell>
                            {new Date(prompt.created_at).toLocaleDateString('ru-RU')}
                          </TableCell>
                          <TableCell>
                            {new Date(prompt.updated_at).toLocaleDateString('ru-RU')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Аналитика системы</h3>
                <p className="text-sm text-muted-foreground">Данные за последний месяц</p>
              </div>
              <Button onClick={exportAnalyticsToCSV} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Экспорт CSV
              </Button>
            </div>

            {analytics && (
              <>
                {/* Итоговые метрики */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold">{analytics.totals.users}</div>
                      <p className="text-xs text-muted-foreground">Всего пользователей</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold">{analytics.totals.generations}</div>
                      <p className="text-xs text-muted-foreground">Всего генераций</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold">{analytics.totals.tokens}</div>
                      <p className="text-xs text-muted-foreground">Потрачено токенов</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold">{analytics.totals.revenue}₽</div>
                      <p className="text-xs text-muted-foreground">Общий доход</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Таблица с детальными данными */}
                <Card>
                  <CardContent className="p-0">
                    <div className="max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Дата</TableHead>
                            <TableHead>Пользователи</TableHead>
                            <TableHead>Генерации</TableHead>
                            <TableHead>Токены</TableHead>
                            <TableHead>Доход</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analytics.charts.users.map((_, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                {new Date(analytics.charts.users[index]?.date).toLocaleDateString('ru-RU')}
                              </TableCell>
                              <TableCell>{analytics.charts.users[index]?.value || 0}</TableCell>
                              <TableCell>{analytics.charts.generations[index]?.value || 0}</TableCell>
                              <TableCell>{analytics.charts.tokens[index]?.value || 0}</TableCell>
                              <TableCell>{analytics.charts.revenue[index]?.value || 0}₽</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}