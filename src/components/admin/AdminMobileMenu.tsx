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
  FileText
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface AdminMobileMenuProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const AdminMobileMenu = ({ activeTab, onTabChange }: AdminMobileMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const menuItems = [
    { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
    { id: 'users', label: 'Пользователи', icon: Users },
    { id: 'partners', label: 'Партнеры', icon: Handshake },
    { id: 'prompts', label: 'Модель', icon: Bot },
    { id: 'bonuses', label: 'Бонусы', icon: Gift },
    { id: 'pricing', label: 'Цены', icon: DollarSign },
    { id: 'banners', label: 'Баннеры', icon: LayoutDashboard },
    { id: 'news', label: 'Новости', icon: Megaphone },
    { id: 'blog', label: 'Блог', icon: FileText },
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
      <SheetContent side="left" className="w-80 p-0 bg-card/95 backdrop-blur-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-5 border-b border-border">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-9 h-9 flex items-center justify-center bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20 rounded-lg">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">WBGen</span>
            </div>
            
            <div className="rounded-2xl p-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-primary">Админ-панель</span>
                <Badge className="bg-primary hover:bg-primary text-primary-foreground font-bold px-2.5 py-0.5 text-xs">
                  Admin
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Управление системой WBGen
              </p>
            </div>
          </div>

          <Separator className="opacity-50" />

          {/* Menu Items */}
          <nav className="flex-1 p-3">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <li key={item.id}>
                    <Button
                      variant="ghost"
                      className={`w-full justify-start px-3 h-11 rounded-[17px] transition-all duration-200 ${
                        isActive 
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground font-medium' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                      }`}
                      onClick={() => handleTabChange(item.id)}
                    >
                      <Icon className={`w-[18px] h-[18px] mr-3 ${isActive ? 'text-primary-foreground' : ''}`} />
                      <span className="flex-1 text-left text-sm">{item.label}</span>
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
