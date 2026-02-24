import { AdminAnalyticsChart, AdminAdditionalMetrics } from "./AdminAnalyticsChart";
import SecurityDashboard from "./SecurityDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileSpreadsheet, Users, CreditCard, Coins, Shield } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Papa from 'papaparse';

export default function AdminAnalytics() {
  const [exporting, setExporting] = useState(false);

  const exportToCSV = async (type: 'users' | 'payments' | 'generations') => {
    setExporting(true);
    try {
      let data: any[] = [];
      let filename = '';

      switch (type) {
        case 'users':
          const { data: users, error: usersError } = await supabase
            .from('profiles')
            .select('id, email, full_name, tokens_balance, wb_connected, created_at, is_blocked')
            .order('created_at', { ascending: false });
          
          if (usersError) throw usersError;
          data = users || [];
          filename = 'users_export.csv';
          break;

        case 'payments':
          const { data: payments, error: paymentsError } = await supabase
            .from('payments')
            .select(`
              id, 
              user_id, 
              amount, 
              currency, 
              tokens_amount, 
              package_name, 
              status, 
              created_at, 
              confirmed_at,
              profiles!inner(email)
            `)
            .order('created_at', { ascending: false });
          
          if (paymentsError) throw paymentsError;
          data = payments?.map(p => ({
            ...p,
            user_email: p.profiles?.email || 'N/A'
          })) || [];
          filename = 'payments_export.csv';
          break;

        case 'generations':
          const { data: generations, error: generationsError } = await supabase
            .from('generations')
            .select(`
              id, 
              user_id, 
              generation_type, 
              tokens_used, 
              status, 
              created_at,
              profiles!inner(email)
            `)
            .order('created_at', { ascending: false });
          
          if (generationsError) throw generationsError;
          data = generations?.map(g => ({
            ...g,
            user_email: g.profiles?.email || 'N/A'
          })) || [];
          filename = 'generations_export.csv';
          break;
      }

      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast(`Экспорт ${type === 'users' ? 'пользователей' : type === 'payments' ? 'платежей' : 'генераций'} завершен!`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast("Не удалось экспортировать данные. Попробуйте позже", { style: { background: '#ef4444' } });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analytics">Аналитика</TabsTrigger>
          <TabsTrigger value="security">Безопасность</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-8">
          {/* Export Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Экспорт данных
              </CardTitle>
              <CardDescription>
                Экспортируйте данные в формате CSV для дальнейшего анализа
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => exportToCSV('users')}
                  disabled={exporting}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  {exporting ? 'Экспорт...' : 'Пользователи'}
                  <Download className="h-4 w-4" />
                </Button>
                
                <Button
                  onClick={() => exportToCSV('payments')}
                  disabled={exporting}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  {exporting ? 'Экспорт...' : 'Платежи'}
                  <Download className="h-4 w-4" />
                </Button>
                
                <Button
                  onClick={() => exportToCSV('generations')}
                  disabled={exporting}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Coins className="h-4 w-4" />
                  {exporting ? 'Экспорт...' : 'Генерации'}
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Additional Metrics */}
          <AdminAdditionalMetrics />

          {/* Beautiful Analytics Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AdminAnalyticsChart type="users" />
            <AdminAnalyticsChart type="generations" />
            <AdminAnalyticsChart type="tokens" />
            <AdminAnalyticsChart type="revenue" />
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-8">
          <SecurityDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}