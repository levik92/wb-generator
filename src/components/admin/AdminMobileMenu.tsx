import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Menu, 
  Zap, 
  BarChart3, 
  Users, 
  FileText, 
  Gift, 
  Megaphone 
} from "lucide-react";

interface AdminMobileMenuProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const AdminMobileMenu = ({ activeTab, onTabChange }: AdminMobileMenuProps) => {
  const [open, setOpen] = useState(false);
  
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
      badge: 'Скоро',
      disabled: true
    }
  ];

  const handleTabChange = (tabId: string) => {
    onTabChange(tabId);
    setOpen(false); // Close menu after selection
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="md:hidden bg-wb-purple/10 hover:bg-wb-purple/20 border-wb-purple/20"
        >
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
            
            <div className="bg-wb-purple/5 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-wb-purple">Админ-панель</span>
                <Badge variant="secondary" className="bg-wb-purple hover:bg-wb-purple-light text-white text-xs">
                  Admin
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Управление системой WB Генератор
              </p>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <div key={item.id} className="relative">
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={`w-full justify-start text-left ${
                        isActive ? 'bg-wb-purple/10 text-wb-purple' : ''
                      } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => !item.disabled && handleTabChange(item.id)}
                      disabled={item.disabled}
                    >
                      <Icon className="w-4 h-4 mr-3" />
                      {item.label}
                    </Button>
                    {item.badge && (
                      <Badge 
                        className="absolute -top-1 -right-1 text-[8px] px-1 py-0 h-4 min-w-0 bg-muted text-muted-foreground border-0 rounded-md shadow-sm z-10 pointer-events-none"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
};