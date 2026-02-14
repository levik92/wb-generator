import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, Zap, Image, FileText, History, CreditCard, Gift, Settings, Tags, Newspaper, GraduationCap, Video, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  tokens_balance: number;
  wb_connected: boolean;
  referral_code: string;
}
interface MobileMenuProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  profile: Profile;
  hasUnreadNews?: boolean;
}
export const MobileMenu = ({
  activeTab,
  onTabChange,
  profile,
  hasUnreadNews = false
}: MobileMenuProps) => {
  const [open, setOpen] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const menuItems = [{
    id: 'cards',
    label: 'Карточки товара',
    icon: Image
  }, {
    id: 'description',
    label: 'Описания товара',
    icon: FileText
  }, {
    id: 'labels',
    label: 'Этикетки и QR',
    icon: Tags,
    badge: 'FREE',
    badgeColor: 'bg-green-500'
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
    badge: hasUnreadNews ? 'Новое' : undefined,
    badgeColor: hasUnreadNews ? 'bg-wb-purple text-white' : undefined
  }, {
    id: 'learning',
    label: 'Обучение',
    icon: GraduationCap
  }, {
    id: 'bonuses',
    label: 'Бонусы',
    icon: Gift
  }, {
    id: 'video',
    label: 'Видеообложки',
    icon: Video,
    badge: 'Beta',
    badgeColor: 'bg-muted text-muted-foreground'
  }, {
    id: 'settings',
    label: 'Настройки',
    icon: Settings
  }];
  const handleTabChange = (tabId: string) => {
    onTabChange(tabId);
    setOpen(false); // Close menu after selection
  };
  return <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden bg-wb-purple/10 hover:bg-wb-purple/20 border-wb-purple/20">
          <Menu className="h-5 w-5 text-wb-purple" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-hero rounded-[12px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold">WB Генератор</span>
            </div>
            
            {/* Token Balance */}
            <div className="space-y-2 border-solid border-8 border-secondary rounded-md bg-secondary">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Токены</span>
                <Badge variant="secondary" className="font-semibold bg-muted">
                  {profile.tokens_balance}
                </Badge>
              </div>
              <Button size="sm" className="w-full bg-wb-purple hover:bg-wb-purple-dark" onClick={() => handleTabChange('pricing')}>
                Пополнить
              </Button>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return <div key={item.id} className="relative">
                    <Button variant={isActive ? "secondary" : "ghost"} className={`w-full justify-start text-left ${isActive ? 'bg-wb-purple/10 text-wb-purple' : ''}`} onClick={() => handleTabChange(item.id)}>
                      <Icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </Button>
                    {item.badge && <Badge className={`absolute -top-1 -right-1 text-[8px] px-1 py-0 h-4 min-w-0 ${item.badgeColor || 'bg-muted text-muted-foreground'} border-0 rounded-md shadow-sm z-10 pointer-events-none`}>
                        {item.badge}
                      </Badge>}
                  </div>;
            })}
            </div>
          </nav>

          {/* Theme Toggle */}
          <div className="p-4 pt-0">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => setTheme(isDark ? "light" : "dark")}
            >
              {isDark ? (
                <Sun className="w-4 h-4 mr-2" />
              ) : (
                <Moon className="w-4 h-4 mr-2" />
              )}
              {isDark ? "Светлая тема" : "Тёмная тема"}
            </Button>
          </div>

          {/* WB Connection Status */}
          <div className="p-4 pt-0">
            <div className="bg-secondary rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Wildberries</span>
                <Badge variant="outline" className="text-xs">
                  В разработке
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Скоро появится автоматическая загрузка карточек в ваш кабинет WB
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>;
};