import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, User, UserIcon, Bell, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useIsMobile } from "@/hooks/use-mobile";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  tokens_balance: number;
  wb_connected: boolean;
  referral_code: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

interface DashboardHeaderProps {
  profile: Profile;
  onSignOut: () => void;
  onNavigateToSettings: () => void;
}

export const DashboardHeader = ({
  profile,
  onSignOut,
  onNavigateToSettings
}: DashboardHeaderProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchNotifications();
  }, [profile.id]);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data && !error) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    }
  };

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (!error) {
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', unreadIds);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'generation': return '🎨';
      case 'payment': return '💰';
      case 'referral': return '👥';
      case 'security': return '🔒';
      default: return '📢';
    }
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-20">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-foreground">Добро пожаловать!</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            AI-сервис для создания карточек Wildberries
          </p>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <ThemeToggle />
          
          {/* Notifications */}
          {!isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-xl hover:bg-secondary">
                  <Bell className="h-[18px] w-[18px] text-muted-foreground" />
                  {unreadCount > 0 && (
                    <div className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-[10px] font-bold text-primary-foreground">{unreadCount}</span>
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto bg-card border shadow-xl rounded-xl" align="end" forceMount>
                <div className="flex items-center justify-between p-3 border-b">
                  <h3 className="font-semibold text-sm">Уведомления</h3>
                  {unreadCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={markAllAsRead} 
                      className="text-xs h-auto py-1 px-2 hover:bg-primary/10 text-primary hover:text-foreground"
                    >
                      Прочитать все
                    </Button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    Нет уведомлений
                  </div>
                ) : (
                  notifications.map(notification => (
                    <DropdownMenuItem 
                      key={notification.id} 
                      className={`group p-3 cursor-pointer border-b last:border-b-0 hover:bg-primary hover:text-primary-foreground ${
                        !notification.read ? 'bg-primary/5' : ''
                      } [&:hover_p]:text-primary-foreground [&:hover_span]:text-primary-foreground/80`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start space-x-3 w-full">
                        <span className="text-lg flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate text-foreground">
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(notification.created_at).toLocaleDateString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={`relative rounded-xl ${isMobile ? 'h-9 w-9' : 'h-10 w-10'} hover:bg-secondary`}>
                <Avatar className={isMobile ? 'h-8 w-8' : 'h-9 w-9'}>
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold">
                    <UserIcon className={isMobile ? 'h-4 w-4' : 'h-[18px] w-[18px]'} />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-card border shadow-xl rounded-xl" align="end" forceMount>
              <div className="flex flex-col space-y-1 p-3">
                <p className="text-sm font-semibold leading-none">
                  {profile.full_name || 'Пользователь'}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {profile.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="hover:bg-primary/5 cursor-pointer rounded-lg mx-1" onClick={onNavigateToSettings}>
                <User className="mr-2 h-4 w-4" />
                <span>Профиль</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-primary/5 cursor-pointer rounded-lg mx-1" onClick={() => window.location.href = '/partner'}>
                <Users className="mr-2 h-4 w-4" />
                <span>Партнерам</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut} className="hover:bg-destructive/10 text-destructive cursor-pointer rounded-lg mx-1">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Выйти</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
