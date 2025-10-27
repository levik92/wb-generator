import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  BarChart3, 
  Users, 
  FileText, 
  Gift,
  Megaphone,
  Zap,
  ChevronLeft,
  ChevronRight,
  Handshake
} from "lucide-react";
import { useState } from "react";

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
      label: 'Промты',
      icon: FileText,
    },
    {
      id: 'promocodes',
      label: 'Промокоды',
      icon: Gift,
    },
    {
      id: 'news',
      label: 'Новости',
      icon: Megaphone,
    }
  ];

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} shrink-0 border-r border-border flex flex-col transition-all duration-300`} style={{ backgroundColor: '#fcfcfc' }}>
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
                  }`}
                  onClick={() => onTabChange(item.id)}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 ${!isCollapsed ? 'mr-3' : ''}`} />
                  {!isCollapsed && <span className="flex-1 text-left">{item.label}</span>}
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};