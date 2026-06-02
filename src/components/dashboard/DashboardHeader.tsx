import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, User, Bell, Users, Headphones, Zap, Image as ImageIcon, FileText, History as HistoryIcon, CreditCard, Gift, Settings as SettingsIcon, Tags, Newspaper, GraduationCap, Video, Sparkles } from "lucide-react";
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

const TAB_META: Record<string, { title: string; subtitle: string; icon: any }> = {
  cards:        { title: 'Генерация карточек',   subtitle: 'Создайте карточки для Wildberries с помощью ИИ', icon: ImageIcon },
  video:        { title: 'Видеообложки',         subtitle: 'Создайте видеообложки для карточек',              icon: Video },
  description:  { title: 'Генерация описаний',   subtitle: 'Создайте описание товара для Wildberries',        icon: FileText },
  labels:       { title: 'Генератор этикеток',   subtitle: 'Создание этикеток для товаров',                   icon: Tags },
  history:      { title: 'История генераций',    subtitle: 'Все ваши созданные карточки и описания',          icon: HistoryIcon },
  pricing:      { title: 'Баланс',               subtitle: 'Пополнение и управление токенами',                icon: CreditCard },
  bonuses:      { title: 'Бонусы',               subtitle: 'Бонусные и реферальные программы',                icon: Gift },
  settings:     { title: 'Настройки',            subtitle: 'Управление профилем и подключениями',             icon: SettingsIcon },
  notifications:{ title: 'Уведомления',          subtitle: 'Ваши уведомления',                                icon: Bell },
  news:         { title: 'Новости',              subtitle: 'Последние обновления сервиса',                    icon: Newspaper },
  learning:     { title: 'Обучение',             subtitle: 'Видеоуроки и материалы',                          icon: GraduationCap },
  support:      { title: 'Поддержка',            subtitle: 'Чат с поддержкой',                                icon: Headphones },
};

interface DashboardHeaderProps {
  profile: Profile;
  activeTab: string;
  onSignOut: () => void;
  onNavigateToSettings: () => void;
  onNavigateToSupport?: () => void;
  onNavigateToBalance?: () => void;
  headerActions?: React.ReactNode;
}

export const DashboardHeader = ({
  profile,
  activeTab,
  onSignOut,
  onNavigateToSettings,
  onNavigateToSupport,
  onNavigateToBalance,
  headerActions,
}: DashboardHeaderProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const isMobile = useIsMobile();

  const currentTab = TAB_META[activeTab] || TAB_META.cards;
  const TabIcon = currentTab.icon;

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

  const initials = (profile.full_name?.[0] || profile.email?.[0] || 'U').toUpperCase();
  const balanceFormatted = (profile.tokens_balance ?? 0).toLocaleString('ru-RU');

  return (
    <header className="border-b border-border/60 bg-card/85 backdrop-blur-md sticky top-0 z-20">
      <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
        {/* Left: tab title */}
        <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1 overflow-hidden">
          <div className="min-w-0 flex-1 overflow-hidden">
            <h1 className="text-[15px] md:text-[17px] font-semibold text-foreground truncate tracking-tight leading-tight">
              {currentTab.title}
            </h1>
            {currentTab.subtitle && (
              <p className="text-[11.5px] md:text-xs text-muted-foreground hidden sm:block truncate mt-0.5">
                {currentTab.subtitle}
              </p>
            )}
          </div>
          {headerActions && (
            <div className="flex items-center gap-2 shrink-0">
              {headerActions}
            </div>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">


          <ThemeToggle />

          {/* Notifications */}
          {!isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-xl hover:bg-violet-500/10 hover:text-violet-600 transition-colors">
                  <Bell className="h-[18px] w-[18px]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm shadow-violet-500/40 ring-2 ring-card">
                      <span className="text-[10px] font-bold text-white leading-none">{unreadCount > 9 ? '9+' : unreadCount}</span>
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[340px] max-h-[420px] overflow-y-auto bg-card border shadow-xl rounded-xl p-0" align="end" sideOffset={8} forceMount>
                <div className="flex items-center justify-between p-3 border-b border-border/60 sticky top-0 bg-card z-10">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-violet-600 dark:text-violet-300" />
                    <h3 className="font-semibold text-sm">Уведомления</h3>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-[11px] h-7 px-2 rounded-lg hover:bg-violet-500/10 text-violet-600 hover:text-violet-700 font-medium"
                    >
                      Прочитать всё
                    </Button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-violet-500/15 to-purple-500/5 border border-violet-500/20 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-violet-600 dark:text-violet-300" />
                    </div>
                    <p className="text-sm font-medium">Пока пусто</p>
                    <p className="text-xs text-muted-foreground mt-1">Новые уведомления появятся здесь</p>
                  </div>
                ) : (
                  <div className="py-1">
                    {notifications.map(notification => (
                      <DropdownMenuItem
                        key={notification.id}
                        className={`group p-3 mx-1 my-0.5 rounded-lg cursor-pointer hover:bg-violet-500/[0.07] focus:bg-violet-500/[0.07] ${
                          !notification.read ? 'bg-violet-500/[0.04]' : ''
                        }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex items-start gap-3 w-full">
                          <span className="text-lg flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[13px] truncate text-foreground">
                              {notification.title}
                            </p>
                            <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                              {notification.message}
                            </p>
                            <p className="text-[10px] text-muted-foreground/80 mt-1">
                              {new Date(notification.created_at).toLocaleDateString('ru-RU', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-violet-500 rounded-full flex-shrink-0 mt-1.5 shadow-sm shadow-violet-500/50" />
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-xl hover:bg-violet-500/10 transition-colors p-0">
                <Avatar className="h-9 w-9 ring-2 ring-violet-500/20">
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white font-semibold text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 bg-card border shadow-xl rounded-xl" align="end" sideOffset={8} forceMount>
              <div className="flex items-center gap-3 p-3">
                <Avatar className="h-10 w-10 ring-2 ring-violet-500/20">
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white font-semibold text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">
                    {profile.full_name || 'Пользователь'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {profile.email}
                  </p>
                </div>
              </div>
              {onNavigateToBalance && (
                <>
                  <DropdownMenuSeparator />
                  <button
                    onClick={onNavigateToBalance}
                    className="w-full mx-1 my-0.5 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-500/[0.08] to-purple-500/[0.06] hover:from-violet-500/[0.12] hover:to-purple-500/[0.10] border border-violet-500/15 transition-colors"
                    style={{ width: 'calc(100% - 8px)' }}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-violet-300" />
                      <span className="text-xs text-muted-foreground">Баланс</span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-violet-700 dark:text-violet-300">{balanceFormatted}</span>
                  </button>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="hover:bg-violet-500/10 hover:text-violet-600 focus:bg-violet-500/10 focus:text-violet-600 cursor-pointer rounded-lg mx-1" onClick={() => window.location.href = '/partners/cabinet'}>
                <Users className="mr-2 h-4 w-4" />
                <span>Партнёрам</span>
              </DropdownMenuItem>
              {onNavigateToSupport && (
                <DropdownMenuItem className="hover:bg-violet-500/10 hover:text-violet-600 focus:bg-violet-500/10 focus:text-violet-600 cursor-pointer rounded-lg mx-1" onClick={onNavigateToSupport}>
                  <Headphones className="mr-2 h-4 w-4" />
                  <span>Поддержка</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="hover:bg-violet-500/10 hover:text-violet-600 focus:bg-violet-500/10 focus:text-violet-600 cursor-pointer rounded-lg mx-1" onClick={onNavigateToSettings}>
                <User className="mr-2 h-4 w-4" />
                <span>Настройки</span>
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
