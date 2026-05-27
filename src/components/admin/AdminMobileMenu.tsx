import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Menu, 
  Zap, 
  BarChart3, 
  Users, 
  Bot, 
  Gift, 
  Megaphone,
  Handshake,
  DollarSign,
  LayoutDashboard,
  FileText,
  GraduationCap,
  Headphones,
  Crosshair,
  Receipt
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface AdminMobileMenuProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadSupportCount?: number;
  pendingInvoicesCount?: number;
  pendingBonusesCount?: number;
}

export const AdminMobileMenu = ({ activeTab, onTabChange, unreadSupportCount = 0, pendingInvoicesCount = 0, pendingBonusesCount = 0 }: AdminMobileMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const menuItems = [
    { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
    { id: 'users', label: 'Пользователи', icon: Users },
    { id: 'support', label: 'Поддержка', icon: Headphones, badge: unreadSupportCount > 0 ? unreadSupportCount.toString() : undefined },
    { id: 'utm', label: 'Трафик', icon: Crosshair },
    { id: 'partners', label: 'Партнеры', icon: Handshake },
    { id: 'payments_admin', label: 'Оплаты', icon: Receipt, badge: pendingInvoicesCount > 0 ? pendingInvoicesCount.toString() : undefined },
    { id: 'prompts', label: 'Модель', icon: Bot },
    { id: 'bonuses', label: 'Бонусы', icon: Gift, badge: pendingBonusesCount > 0 ? pendingBonusesCount.toString() : undefined },
    { id: 'pricing', label: 'Цены', icon: DollarSign },
    { id: 'banners', label: 'Баннеры', icon: LayoutDashboard },
    { id: 'news', label: 'Новости', icon: Megaphone },
    { id: 'blog', label: 'Блог', icon: FileText },
    { id: 'video_lessons', label: 'Обучение', icon: GraduationCap },
  ];

  const handleTabChange = (tabId: string) => {
    onTabChange(tabId);
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden h-9 w-9 rounded-xl hover:bg-secondary"
        >
          <Menu className="h-5 w-5 text-muted-foreground" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0 bg-card [&>button]:top-[30px]">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-5 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25 rounded-lg">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">WBGen</span>
            </div>
          </div>

          <Separator className="opacity-50" />

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto p-3">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <li key={item.id}>
                    <Button
                      variant="ghost"
                      className={`group w-full justify-start px-3 h-11 rounded-[14px] transition-all duration-200 ${
                        isActive 
                          ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-500 hover:to-purple-600 hover:text-white font-medium shadow-md shadow-violet-500/25' 
                          : 'text-muted-foreground hover:text-violet-600 hover:bg-violet-500/10'
                      }`}
                      onClick={() => handleTabChange(item.id)}
                    >
                      <Icon className={`w-[18px] h-[18px] mr-3 ${isActive ? 'text-white' : 'group-hover:text-violet-600'}`} />
                      <span className="flex-1 text-left text-sm">{item.label}</span>
                      {(item as any).badge && (
                        <Badge className={`text-[10px] px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center ${isActive ? 'bg-white/95 text-violet-600 border-white/95' : 'bg-violet-500 text-white border-violet-500'} rounded-full shadow-sm font-semibold`}>
                          {(item as any).badge}
                        </Badge>
                      )}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Theme Toggle */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Тема</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
