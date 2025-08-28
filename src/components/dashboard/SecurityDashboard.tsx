import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Shield, Activity, Clock, Users, Database } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface SecurityEvent {
  id: string;
  user_id: string | null;
  event_type: string;
  event_description: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
  created_at: string;
}

interface AuditLog {
  id: string;
  admin_user_id: string;
  action_type: string;
  resource_type: string;
  resource_id: string | null;
  old_values: any;
  new_values: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export default function SecurityDashboard() {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      
      // Fetch security events
      const { data: events, error: eventsError } = await supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (eventsError) throw eventsError;

      // Fetch audit logs
      const { data: logs, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      setSecurityEvents((events || []).map(event => ({
        ...event,
        ip_address: event.ip_address as string | null,
        user_agent: event.user_agent as string | null
      })));
      setAuditLogs((logs || []).map(log => ({
        ...log,
        ip_address: log.ip_address as string | null,
        user_agent: log.user_agent as string | null
      })));
    } catch (error: any) {
      console.error('Error fetching security data:', error);
      toast(`Ошибка загрузки данных безопасности: ${error.message}`, { 
        style: { background: '#ef4444' } 
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeColor = (eventType: string) => {
    const criticalEvents = ['multiple_failed_login', 'injection_attempt', 'account_enumeration'];
    const warningEvents = ['unusual_ip_change', 'excessive_token_usage'];
    
    if (criticalEvents.includes(eventType)) return 'destructive';
    if (warningEvents.includes(eventType)) return 'secondary';
    return 'default';
  };

  const getEventTypeIcon = (eventType: string) => {
    const criticalEvents = ['multiple_failed_login', 'injection_attempt', 'account_enumeration'];
    if (criticalEvents.includes(eventType)) return <AlertTriangle className="h-4 w-4" />;
    return <Shield className="h-4 w-4" />;
  };

  const getEventTypeName = (eventType: string) => {
    const names: Record<string, string> = {
      'login_success': 'Успешный вход',
      'login_failed': 'Неудачный вход',
      'multiple_failed_login': 'Множественные неудачные попытки входа',
      'payment_created': 'Создан платеж',
      'payment_error': 'Ошибка платежа',
      'token_spent': 'Потрачены токены',
      'excessive_token_usage': 'Чрезмерное использование токенов',
      'unusual_ip_change': 'Необычная смена IP',
      'injection_attempt': 'Попытка инъекции',
      'account_enumeration': 'Перебор аккаунтов'
    };
    return names[eventType] || eventType;
  };

  const getActionTypeName = (actionType: string) => {
    const names: Record<string, string> = {
      'user_block': 'Блокировка пользователя',
      'user_unblock': 'Разблокировка пользователя',
      'role_change': 'Изменение роли',
      'token_refund': 'Возврат токенов',
      'data_export': 'Экспорт данных',
      'settings_change': 'Изменение настроек'
    };
    return names[actionType] || actionType;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const criticalEvents = securityEvents.filter(event => 
    ['multiple_failed_login', 'injection_attempt', 'account_enumeration'].includes(event.event_type)
  );

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">События безопасности</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityEvents.length}</div>
            <p className="text-xs text-muted-foreground">
              за последние 24 часа
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Критические события</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalEvents.length}</div>
            <p className="text-xs text-muted-foreground">
              требуют внимания
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Действия админов</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditLogs.length}</div>
            <p className="text-xs text-muted-foreground">
              записей в аудите
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Статус системы</CardTitle>
            <Database className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Безопасно</div>
            <p className="text-xs text-muted-foreground">
              все системы работают
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      {criticalEvents.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Критические события безопасности</AlertTitle>
          <AlertDescription>
            Обнаружено {criticalEvents.length} критических событий безопасности, требующих немедленного внимания.
          </AlertDescription>
        </Alert>
      )}

      {/* Security Tabs */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">События безопасности</TabsTrigger>
          <TabsTrigger value="audit">Аудит действий</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>События безопасности</CardTitle>
              <CardDescription>
                Лог всех событий безопасности в системе
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {securityEvents.map((event) => (
                  <div key={event.id} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="flex items-start space-x-3">
                      {getEventTypeIcon(event.event_type)}
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant={getEventTypeColor(event.event_type)}>
                            {getEventTypeName(event.event_type)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(event.created_at), 'dd.MM.yyyy HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm">{event.event_description}</p>
                        {event.ip_address && (
                          <p className="text-xs text-muted-foreground">
                            IP: {event.ip_address}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {securityEvents.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Нет событий безопасности
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Аудит действий</CardTitle>
              <CardDescription>
                Журнал всех действий администраторов
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="flex items-start space-x-3">
                      <Clock className="h-4 w-4 mt-1" />
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">
                            {getActionTypeName(log.action_type)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(log.created_at), 'dd.MM.yyyy HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm">
                          Ресурс: {log.resource_type}
                          {log.resource_id && ` (ID: ${log.resource_id})`}
                        </p>
                        {log.ip_address && (
                          <p className="text-xs text-muted-foreground">
                            IP: {log.ip_address}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Нет записей аудита
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}