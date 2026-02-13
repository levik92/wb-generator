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
export const DashboardSidebar = ({
  activeTab,
  onTabChange,
  profile
}: DashboardSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hasUnreadNews, setHasUnreadNews] = useState(false);

  // Check for unread news
  useEffect(() => {
    const checkUnreadNews = async () => {
      try {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (!user) return;
        const {
          data: newsData
        } = await (supabase as any).from('news').select('id, published_at').eq('is_published', true).order('published_at', {
          ascending: false
        }).limit(5);
        if (newsData && newsData.length > 0) {
          const {
            data: readData
          } = await (supabase as any).from('news_read_status').select('news_id').eq('user_id', user.id);
          const readIds = new Set((readData as any)?.map((r: any) => r.news_id) || []);
          const hasUnread = (newsData as any).some((news: any) => !readIds.has(news.id));
          setHasUnreadNews(hasUnread);
        }
      } catch (error) {
        console.error('Error checking unread news:', error);
      }
    };
    checkUnreadNews();
  }, []);

  // Count unread news
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    const countUnreadNews = async () => {
      try {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (!user) return;
        const {
          data: newsData
        } = await (supabase as any).from('news').select('id').eq('is_published', true);
        if (newsData && newsData.length > 0) {
          const {
            data: readData
          } = await (supabase as any).from('news_read_status').select('news_id').eq('user_id', user.id);
          const readIds = new Set((readData as any)?.map((r: any) => r.news_id) || []);
          const count = (newsData as any).filter((news: any) => !readIds.has(news.id)).length;
          setUnreadCount(count);
          setHasUnreadNews(count > 0);
        }
      } catch (error) {
        console.error('Error counting unread news:', error);
      }
    };
    countUnreadNews();
  }, []);
  const menuItems = [{
    id: 'cards',
    label: 'Генерация карточек',
    icon: Image
  }, {
    id: 'video',
    label: 'Видеообложки',
    icon: Video,
    badge: 'Beta',
    badgeColor: 'bg-muted text-muted-foreground border-border'
  }, {
    id: 'description',
    label: 'Генерация описаний',
    icon: FileText
  }, {
    id: 'labels',
    label: 'Генератор этикеток',
    icon: Tags
  }, {
    id: 'history',
    label: 'История',
    icon: History
  }, {
    id: 'pricing',
    label: 'Баланс',
    icon: CreditCard
  }, {
    id: 'news',
    label: 'Новости',
    icon: Newspaper,
    badge: unreadCount > 0 ? unreadCount.toString() : undefined,
    badgeColor: unreadCount > 0 ? 'bg-primary text-primary-foreground border-primary' : undefined
  }, {
    id: 'bonuses',
    label: 'Бонусы',
    icon: Gift
  }, {
    id: 'learning',
    label: 'Обучение',
    icon: GraduationCap
  }, {
    id: 'settings',
    label: 'Настройки',
    icon: Settings
  }];
  return <div className={`${isCollapsed ? 'w-20' : 'w-64'} h-screen border-r border-border bg-card/80 backdrop-blur-xl flex flex-col transition-all duration-300 overflow-y-auto`}>
      {/* Logo / Collapse Toggle */}
      <div className={`p-4 ${isCollapsed ? 'p-3' : 'p-5'}`}>
        <div className="flex items-center justify-between">
          {isCollapsed ? <div className="flex justify-center w-full">
              <Button variant="ghost" size="sm" onClick={() => setIsCollapsed(!isCollapsed)} className="hidden md:flex h-9 w-9 p-0 rounded-xl bg-secondary hover:bg-accent/10 text-muted-foreground hover:text-accent">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div> : <>
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 flex items-center justify-center bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20 rounded-lg">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">WBGen</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsCollapsed(!isCollapsed)} className="hidden md:flex h-9 w-9 p-0 rounded-xl bg-secondary hover:bg-accent/10 text-muted-foreground hover:text-accent">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </>}
        </div>
      </div>

      {/* Token Balance */}
      <div className={`px-4 pb-4 ${isCollapsed ? 'px-3' : 'px-4'}`}>
        {isCollapsed ? <div className="flex justify-center">
            <Button size="sm" className="w-10 h-10 p-0 rounded-xl btn-gradient" onClick={() => onTabChange('pricing')}>
              <Plus className="w-4 h-4" />
            </Button>
          </div> : <div className="rounded-2xl p-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-primary">Токены</span>
              <Badge className="bg-primary hover:bg-primary text-primary-foreground font-bold px-2.5 py-0.5 text-xs">
                {profile.tokens_balance}
              </Badge>
            </div>
            <Button size="sm" onClick={() => onTabChange('pricing')} className="w-full h-9 btn-gradient rounded-[15px] text-sm font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              Пополнить
            </Button>
          </div>}
      </div>

      <Separator className="opacity-50" />

      {/* Navigation */}
      <nav className={`flex-1 p-2 ${isCollapsed ? 'p-2' : 'p-3'}`}>
        <ul className="space-y-2">
          {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return <li key={item.id} className="relative">
                <Button variant="ghost" className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start px-3'} h-11 rounded-[17px] transition-all duration-200 ${isActive ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`} onClick={() => onTabChange(item.id)} title={isCollapsed ? item.label : undefined}>
                  <Icon className={`w-[18px] h-[18px] ${!isCollapsed ? 'mr-3' : ''} ${isActive ? 'text-primary-foreground' : ''}`} />
                  {!isCollapsed && <span className="flex-1 text-left text-sm">{item.label}</span>}
                </Button>
                {item.badge && !isCollapsed && <div className="absolute top-1/2 -translate-y-1/2 right-3">
                    <Badge className={`text-[10px] px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center ${isActive ? 'bg-white/90 text-emerald-600 border-white/90' : item.badgeColor || 'bg-muted text-muted-foreground border-border'} rounded-full shadow-sm pointer-events-none font-semibold`}>
                      {item.badge}
                    </Badge>
                  </div>}
              </li>;
        })}
        </ul>
      </nav>
    </div>;
};