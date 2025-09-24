import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Image, 
  FileText, 
  History, 
  CreditCard, 
  Users, 
  Settings, 
  Zap,
  Plus,
  ChevronLeft,
  ChevronRight,
  Tags,
  Newspaper,
  GraduationCap
} from "lucide-react";
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
  const [hasUnreadNews, setHasUnreadNews] = useState(false);

  // Check for unread news
  useEffect(() => {
    const checkUnreadNews = async () => {
      try {
        // This is a simplified check - in real implementation you'd check against read status
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Use any type to bypass TypeScript checks for news table
        const { data: newsData } = await (supabase as any)
          .from('news')
          .select('id, published_at')
          .eq('is_published', true)
          .order('published_at', { ascending: false })
          .limit(5);

        if (newsData && newsData.length > 0) {
          const { data: readData } = await (supabase as any)
            .from('news_read_status')
            .select('news_id')
            .eq('user_id', user.id);

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
  
  const menuItems = [
    {
      id: 'cards',
      label: 'Генерация карточек',
      icon: Image,
    },
    {
      id: 'description',
      label: 'Генерация описаний',
      icon: FileText,
    },
    {
      id: 'labels',
      label: 'Генератор этикеток',
      icon: Tags,
      badge: 'FREE',
      badgeColor: 'bg-green-500'
    },
    {
      id: 'history',
      label: 'История',
      icon: History,
    },
    {
      id: 'pricing',
      label: 'Баланс',
      icon: CreditCard,
    },
    {
      id: 'news',
      label: 'Новости',
      icon: Newspaper,
      badge: hasUnreadNews ? 'Новое' : undefined,
      badgeColor: hasUnreadNews ? 'bg-wb-purple text-white' : undefined
    },
    {
      id: 'referrals',
      label: 'Рефералы',
      icon: Users,
    },
    {
      id: 'learning',
      label: 'Обучение',
      icon: GraduationCap,
    },
    {
      id: 'ai-questions',
      label: 'AI Ответы на вопросы',
      icon: FileText,
      disabled: true,
      badge: 'Скоро'
    },
    {
      id: 'ai-reviews',
      label: 'AI Ответы на отзывы',
      icon: FileText,
      disabled: true,
      badge: 'Скоро'
    },
    {
      id: 'settings',
      label: 'Настройки',
      icon: Settings,
    },
  ];

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-card border-r border-border flex flex-col transition-all duration-300`}>
      {/* Logo / Collapse Toggle */}
      <div className={`p-6 ${isCollapsed ? 'p-4' : 'p-6'}`}>
        <div className="flex items-center justify-between">
          {isCollapsed ? (
            <div className="flex justify-center w-full">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden md:flex h-8 w-8 p-0 bg-muted/50 hover:bg-wb-purple/20 text-muted-foreground hover:text-muted-foreground"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-hero rounded-[12px] flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-semibold">WB Генератор</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden md:flex h-8 w-8 p-0 bg-muted/50 hover:bg-wb-purple/20 text-muted-foreground hover:text-muted-foreground"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Token Balance or Mini Balance */}
      <div className={`px-6 pb-4 ${isCollapsed ? 'px-4' : 'px-6'}`}>
        {isCollapsed ? (
          <div className="flex justify-center">
            <Button 
              size="sm" 
              className="w-8 h-8 p-0 bg-wb-purple hover:bg-wb-purple/80"
              onClick={() => onTabChange('pricing')}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="bg-wb-purple/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-wb-purple">Токены</span>
              <Badge variant="secondary" className="bg-wb-purple hover:bg-wb-purple-light text-white">
                {profile.tokens_balance}
              </Badge>
            </div>
            <Button 
              size="sm" 
              className="w-full bg-wb-purple hover:bg-wb-purple/80"
              onClick={() => onTabChange('pricing')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Пополнить
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* Navigation */}
      <nav className={`flex-1 p-4 ${isCollapsed ? 'p-2' : 'p-4'}`}>
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <li key={item.id} className="relative">
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={`w-full ${isCollapsed ? 'justify-center p-2' : 'justify-start'} ${
                    isActive ? 'bg-wb-purple/10 text-wb-purple' : ''
                  } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => !item.disabled && onTabChange(item.id)}
                  disabled={item.disabled}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 ${!isCollapsed ? 'mr-3' : ''}`} />
                  {!isCollapsed && <span className="flex-1 text-left">{item.label}</span>}
                </Button>
                {item.badge && !isCollapsed && (
                  <Badge 
                    className={`absolute -top-1 -right-1 text-[8px] px-1 py-0 h-4 min-w-0 ${
                      item.badgeColor || 'bg-muted text-muted-foreground'
                    } border-0 rounded-md shadow-sm z-10 pointer-events-none`}
                  >
                    {item.badge}
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* WB Connection Status */}
      <div className={`p-4 ${isCollapsed ? 'p-2' : 'p-4'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} p-3 rounded-lg bg-gray-100/50 border border-gray-200/50 opacity-60`}>
          {!isCollapsed && (
            <>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Wildberries</p>
                <p className="text-xs text-gray-500">В разработке</p>
              </div>
              <span className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-600">Скоро</span>
            </>
          )}
          {isCollapsed && (
            <div className="w-4 h-4 bg-gray-400 rounded-full" title="Wildberries - в разработке" />
          )}
        </div>
      </div>
    </div>
  );
};