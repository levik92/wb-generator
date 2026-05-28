import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Image, FileText, History, CreditCard, Gift, Settings, Zap, Plus, ChevronLeft, ChevronRight, Tags, Newspaper, GraduationCap, Video, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  tokens_balance: number;
  wb_connected: boolean;
  referral_code: string;
}
interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  profile: Profile;
}

export const DashboardSidebar = ({ activeTab, onTabChange, profile }: DashboardSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const countUnreadNews = async () => {
      try {
        const { data: newsData } = await (supabase as any).from('news').select('id').eq('is_published', true);
        if (newsData && newsData.length > 0) {
          const { data: readData } = await (supabase as any).from('news_read_status').select('news_id').eq('user_id', profile.id);
          const readIds = new Set((readData as any)?.map((r: any) => r.news_id) || []);
          const count = (newsData as any).filter((news: any) => !readIds.has(news.id)).length;
          setUnreadCount(count);
        }
      } catch (error) {
        console.error('Error counting unread news:', error);
      }
    };
    countUnreadNews();
  }, [profile.id]);

  const menuItems = [
    { id: 'cards', label: 'Карточки товара', icon: Image },
    { id: 'video', label: 'Видеообложки', icon: Video },
    { id: 'description', label: 'Описания товара', icon: FileText },
    { id: 'labels', label: 'Этикетки и QR', icon: Tags },
    { id: 'history', label: 'История', icon: History },
    { id: 'pricing', label: 'Баланс', icon: CreditCard },
    { id: 'learning', label: 'Обучение', icon: GraduationCap },
    { id: 'bonuses', label: 'Бонусы', icon: Gift },
    { id: 'news', label: 'Новости', icon: Newspaper, badge: unreadCount > 0 ? unreadCount.toString() : undefined, badgeColor: 'bg-violet-500 text-white border-violet-500' },
    { id: 'settings', label: 'Настройки', icon: Settings },
  ];

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} shrink-0 h-screen border-r border-border bg-card flex flex-col transition-all duration-300 overflow-y-auto`}>
      {/* Logo / Collapse Toggle */}
      <div className={`${isCollapsed ? 'px-3 py-5' : 'p-5'}`}>
        <div className="flex items-center justify-between">
          {isCollapsed ? (
            <div className="flex justify-center w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-9 w-9 p-0 rounded-xl bg-secondary hover:bg-violet-500/10 text-muted-foreground hover:text-violet-600 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25 rounded-lg">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-bold tracking-tight">WBGen</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-9 w-9 p-0 rounded-xl bg-secondary hover:bg-violet-500/10 text-muted-foreground hover:text-violet-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Token Balance */}
      <div className={`pb-4 ${isCollapsed ? 'px-3' : 'px-4'}`}>
        {isCollapsed ? (
          <button
            onClick={() => onTabChange('pricing')}
            className="group relative w-full overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/15 via-purple-500/8 to-transparent flex flex-col items-center justify-between py-3 px-2 min-h-[104px] transition-all hover:border-violet-500/50 hover:from-violet-500/25 hover:shadow-lg hover:shadow-violet-500/20"
            title={`Токены: ${profile.tokens_balance}. Пополнить`}
            aria-label={`Токены: ${profile.tokens_balance}. Пополнить баланс`}
          >
            {/* Animated halo */}
            <span
              aria-hidden
              className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-violet-500/30 blur-2xl opacity-60 group-hover:opacity-100 transition-opacity"
            />
            <Sparkles className="relative w-3.5 h-3.5 text-violet-500 dark:text-violet-300" />
            <span className="relative text-base font-extrabold tabular-nums leading-none bg-gradient-to-br from-violet-600 to-purple-600 dark:from-violet-200 dark:to-purple-300 bg-clip-text text-transparent">
              {profile.tokens_balance}
            </span>
            <span className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/30 transition-transform group-hover:scale-110 group-active:scale-95">
              <Plus className="w-4 h-4" strokeWidth={2.5} />
            </span>
          </button>

        ) : (
          <div className="group relative rounded-2xl border border-violet-500/25 bg-card overflow-hidden min-h-[104px] flex flex-col transition-all hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/15">
            {/* Top half — balance display */}
            <div className="relative px-3.5 pt-3 pb-2.5 bg-gradient-to-br from-violet-500/15 via-purple-500/8 to-transparent">
              <span
                aria-hidden
                className="pointer-events-none absolute -top-8 -right-6 w-20 h-20 rounded-full bg-violet-500/25 blur-2xl opacity-70 group-hover:opacity-100 transition-opacity"
              />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-violet-500 dark:text-violet-300" />
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-violet-600/80 dark:text-violet-300/80">Баланс</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-extrabold tabular-nums leading-none bg-gradient-to-br from-violet-600 to-purple-600 dark:from-violet-200 dark:to-purple-300 bg-clip-text text-transparent">
                    {profile.tokens_balance}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground">ток.</span>
                </div>
              </div>
            </div>

            {/* Hairline divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />

            {/* Bottom half — CTA */}
            <button
              onClick={() => onTabChange('pricing')}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[13px] font-semibold text-violet-700 dark:text-violet-200 hover:bg-violet-500/10 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              Пополнить
            </button>
          </div>
        )}

      </div>

      <Separator />

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto ${isCollapsed ? 'p-2' : 'p-3'}`}>
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id} className="relative">
                <Button
                  variant="ghost"
                  className={`group w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start px-3'} h-11 rounded-[14px] transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-500 hover:to-purple-600 hover:text-white font-medium shadow-md shadow-violet-500/25'
                      : 'text-muted-foreground hover:text-violet-600 hover:bg-violet-500/10'
                  }`}
                  onClick={() => onTabChange(item.id)}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-[18px] h-[18px] ${!isCollapsed ? 'mr-3' : ''} ${isActive ? 'text-white' : 'group-hover:text-violet-600'}`} />
                  {!isCollapsed && <span className="flex-1 text-left text-sm">{item.label}</span>}
                </Button>
                {(item as any).badge && !isCollapsed && (
                  <div className="absolute top-1/2 -translate-y-1/2 right-3">
                    <Badge className={`text-[10px] px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center ${isActive ? 'bg-white/95 text-violet-600 border-white/95' : (item as any).badgeColor || 'bg-muted text-muted-foreground border-border'} rounded-full shadow-sm pointer-events-none font-semibold`}>
                      {(item as any).badge}
                    </Badge>
                  </div>
                )}
                {(item as any).badge && isCollapsed && (
                  <div className="absolute -top-0.5 -right-0.5">
                    <div className="w-2.5 h-2.5 bg-violet-500 rounded-full ring-2 ring-card" />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};
