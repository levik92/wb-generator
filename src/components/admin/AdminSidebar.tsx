import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  BarChart3, 
  Users, 
  Bot, 
  Gift,
  Megaphone,
  Zap,
  ChevronLeft,
  ChevronRight,
  Handshake,
  DollarSign,
  LayoutDashboard,
  FileText,
  GraduationCap,
  Headphones,
  Crosshair,
  Receipt
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadSupportCount?: number;
  pendingInvoicesCount?: number;
}

export const AdminSidebar = ({ activeTab, onTabChange, unreadSupportCount = 0, pendingInvoicesCount = 0 }: AdminSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const menuItems = [
    { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
    { id: 'users', label: 'Пользователи', icon: Users },
    { id: 'support', label: 'Поддержка', icon: Headphones, badge: unreadSupportCount > 0 ? unreadSupportCount.toString() : undefined, badgeColor: 'bg-primary text-primary-foreground border-primary' },
    { id: 'utm', label: 'Трафик', icon: Crosshair },
    { id: 'partners', label: 'Партнеры', icon: Handshake },
    { id: 'payments_admin', label: 'Оплаты', icon: Receipt, badge: pendingInvoicesCount > 0 ? pendingInvoicesCount.toString() : undefined, badgeColor: 'bg-orange-500 text-white border-orange-500' },
    { id: 'prompts', label: 'Модель', icon: Bot },
    { id: 'bonuses', label: 'Бонусы', icon: Gift },
    { id: 'pricing', label: 'Цены', icon: DollarSign },
    { id: 'banners', label: 'Баннеры', icon: LayoutDashboard },
    { id: 'news', label: 'Новости', icon: Megaphone },
    { id: 'blog', label: 'Блог', icon: FileText },
    { id: 'video_lessons', label: 'Обучение', icon: GraduationCap },
  ];

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} shrink-0 border-r border-border bg-card flex flex-col transition-all duration-300 hidden md:flex h-screen`}>
      {/* Logo / Collapse Toggle */}
      <div className={`${isCollapsed ? 'p-3' : 'p-5'}`}>
        <div className="flex items-center justify-between">
          {isCollapsed ? (
            <div className="flex justify-center w-full">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-9 w-9 p-0 rounded-xl bg-secondary hover:bg-accent/10 text-muted-foreground hover:text-accent"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 flex items-center justify-center bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20 rounded-lg">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">WBGen</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-9 w-9 p-0 rounded-xl bg-secondary hover:bg-accent/10 text-muted-foreground hover:text-accent"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
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
                  className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start px-3'} h-11 rounded-[17px] transition-all duration-200 ${
                    isActive ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                  onClick={() => onTabChange(item.id)}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-[18px] h-[18px] ${!isCollapsed ? 'mr-3' : ''} ${isActive ? 'text-primary-foreground' : ''}`} />
                  {!isCollapsed && <span className="flex-1 text-left text-sm">{item.label}</span>}
                </Button>
                {(item as any).badge && !isCollapsed && (
                  <div className="absolute top-1/2 -translate-y-1/2 right-3">
                    <Badge className={`text-[10px] px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center ${isActive ? 'bg-white/90 text-destructive border-white/90' : (item as any).badgeColor || 'bg-muted text-muted-foreground border-border'} rounded-full shadow-sm pointer-events-none font-semibold`}>
                      {(item as any).badge}
                    </Badge>
                  </div>
                )}
                {(item as any).badge && isCollapsed && (
                  <div className="absolute -top-0.5 -right-0.5">
                    <div className="w-2.5 h-2.5 bg-destructive rounded-full" />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Theme Toggle */}
      <div className={`p-4 border-t border-border ${isCollapsed ? 'p-2 flex justify-center' : ''}`}>
        {isCollapsed ? (
          <ThemeToggle />
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Тема</span>
            <ThemeToggle />
          </div>
        )}
      </div>
    </div>
  );
};
