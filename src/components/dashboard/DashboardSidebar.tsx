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
  Plus
} from "lucide-react";

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
      id: 'history',
      label: 'История',
      icon: History,
    },
    {
      id: 'pricing',
      label: 'Тарифы',
      icon: CreditCard,
    },
    {
      id: 'referrals',
      label: 'Рефералы',
      icon: Users,
    },
    {
      id: 'settings',
      label: 'Настройки',
      icon: Settings,
    },
  ];

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-hero rounded flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-semibold">WB Генератор</span>
        </div>
      </div>

      {/* Token Balance */}
      <div className="px-6 pb-4">
        <div className="bg-wb-purple/10 rounded-lg p-4 hover:bg-wb-purple/20 transition-colors cursor-pointer">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-wb-purple">Токены</span>
            <Badge variant="secondary" className="bg-wb-purple text-white">
              {profile.tokens_balance}
            </Badge>
          </div>
          <Button 
            size="sm" 
            className="w-full bg-wb-purple hover:bg-wb-purple-dark"
            onClick={() => onTabChange('pricing')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Пополнить
          </Button>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <li key={item.id}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={`w-full justify-start ${
                    isActive ? 'bg-wb-purple/10 text-wb-purple' : ''
                  }`}
                  onClick={() => onTabChange(item.id)}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* WB Connection Status */}
      <div className="p-4">
        <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-100/50 border border-gray-200/50 opacity-60">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">Wildberries</p>
            <p className="text-xs text-gray-500">В разработке</p>
          </div>
          <span className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-600">Скоро</span>
        </div>
      </div>
    </div>
  );
};