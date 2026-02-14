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
  FileText
} from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const AdminSidebar = ({ activeTab, onTabChange }: AdminSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const menuItems = [
    {
      id: 'analytics',
      label: 'Аналитика',
      icon: BarChart3,
    },
    {
      id: 'users',
      label: 'Пользователи',
      icon: Users,
    },
    {
      id: 'partners',
      label: 'Партнеры',
      icon: Handshake,
    },
    {
      id: 'prompts',
      label: 'Модель',
      icon: Bot,
    },
    {
      id: 'bonuses',
      label: 'Бонусы',
      icon: Gift,
    },
    {
      id: 'pricing',
      label: 'Цены',
      icon: DollarSign,
    },
    {
      id: 'banners',
      label: 'Баннеры',
      icon: LayoutDashboard,
    },
    {
      id: 'news',
      label: 'Новости',
      icon: Megaphone,
    },
    {
      id: 'blog',
      label: 'Блог',
      icon: FileText,
    }
  ];

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} shrink-0 border-r border-border bg-card/80 backdrop-blur-xl flex flex-col transition-all duration-300 hidden md:flex h-screen`}>
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
