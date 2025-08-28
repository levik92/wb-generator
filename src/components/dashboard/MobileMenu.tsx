import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, Zap, CreditCard, FileText, History, DollarSign, Users, Settings } from "lucide-react";

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
}

export const MobileMenu = ({ activeTab, onTabChange, profile }: MobileMenuProps) => {
  const [open, setOpen] = useState(false);
  
  const menuItems = [
    { id: 'cards', label: 'Генерация карточек', icon: CreditCard },
    { id: 'description', label: 'Генерация описаний', icon: FileText },
    { id: 'labels', label: 'Генератор этикеток', icon: FileText, badge: 'FREE', badgeColor: 'bg-green-500' },
    { id: 'history', label: 'История', icon: History },
    { id: 'pricing', label: 'Баланс', icon: DollarSign },
    { id: 'referrals', label: 'Рефералы', icon: Users },
    { id: 'settings', label: 'Настройки', icon: Settings },
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
            
            {/* Token Balance */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Токены</span>
                <Badge variant="secondary" className="font-semibold">
                  {profile.tokens_balance}
                </Badge>
              </div>
              <Button 
                size="sm" 
                className="w-full bg-wb-purple hover:bg-wb-purple-dark"
                onClick={() => handleTabChange('pricing')}
              >
                Пополнить
              </Button>
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
                      }`}
                      onClick={() => handleTabChange(item.id)}
                    >
                      <Icon className="w-4 h-4 mr-3" />
                      {item.label}
                    </Button>
                    {item.badge && (
                      <div className={`absolute -top-1 -right-1 text-[8px] px-1 py-0 h-4 rounded text-white ${
                        item.badgeColor || 'bg-muted'
                      } border-0 shadow-sm z-10 pointer-events-none`}>
                        {item.badge}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>

          {/* WB Connection Status */}
          <div className="p-4 border-t">
            <div className="bg-gray-50 rounded-lg p-3">
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
    </Sheet>
  );
};