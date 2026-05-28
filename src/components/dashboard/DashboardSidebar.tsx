import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Image, FileText, History, CreditCard, Gift, Settings, Zap, Plus, ChevronLeft, ChevronRight, Tags, Newspaper, GraduationCap, Video } from "lucide-react";
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
            className="w-full rounded-2xl p-2 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent border border-violet-500/20 flex flex-col items-center justify-center gap-1.5 hover:from-violet-500/15 hover:border-violet-500/30 transition-colors min-h-[104px]"
            title={`Токены: ${profile.tokens_balance}`}
          >
            <span className="text-xs font-bold text-violet-600 dark:text-violet-400 tabular-nums leading-none">
              {profile.tokens_balance}
            </span>
            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/25">
              <Plus className="w-4 h-4" />
            </div>
          </button>
        ) : (
          <div className="rounded-2xl p-4 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent border border-violet-500/20 min-h-[104px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-violet-600 dark:text-violet-400">Токены</span>
              <Badge className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-500 hover:to-purple-600 text-white font-bold px-2.5 py-0.5 text-xs border-0 shadow-sm shadow-violet-500/25 tabular-nums">
                {profile.tokens_balance}
              </Badge>
            </div>

            <Button
              size="sm"
              onClick={() => onTabChange('pricing')}
              className="w-full h-9 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-violet-500/25 transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              Пополнить
            </Button>
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
