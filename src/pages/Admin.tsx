import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { 
  LogOut,
  Download,
  Loader2
} from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminMobileMenu } from "@/components/admin/AdminMobileMenu";
import { AdminAnalytics } from "@/components/admin/AdminAnalytics";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { PromptManager } from "@/components/dashboard/PromptManager";
import { DataExportDialog } from "@/components/dashboard/DataExportDialog";
import { PromoCodeManager } from "@/components/dashboard/PromoCodeManager";
import { AdminNews } from "@/components/admin/AdminNews";
import { AdminPartners } from "@/components/admin/AdminPartners";
import { useIsMobile } from "@/hooks/use-mobile";
import Footer from "@/components/Footer";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  tokens_balance: number;
  wb_connected: boolean;
  is_blocked: boolean;
  created_at: string;
  referral_code: string;
}

interface UserStats {
  total_users: number;
  total_generations: number;
  total_tokens_spent: number;
  total_revenue: number;
}

type ActiveTab = 'analytics' | 'users' | 'partners' | 'prompts' | 'promocodes' | 'news';

export default function Admin() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('analytics');
  const isMobile = useIsMobile();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .single();

      if (error || !userRoles) {
        toast({
          title: "Доступ запрещен",
          description: "У вас нет прав администратора",
          variant: "destructive",
        });
        navigate('/dashboard');
        return;
      }

      setIsAdmin(true);
      await loadUsers();
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    // Use the secure admin function to get all users
    const { data, error } = await supabase.rpc('admin_get_all_users');

    if (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить пользователей",
        variant: "destructive",
      });
    } else {
      setUsers(data || []);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as ActiveTab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'analytics':
        return <AdminAnalytics users={users} />;
      case 'users':
        return <AdminUsers users={users} onUsersUpdate={loadUsers} />;
      case 'partners':
        return <AdminPartners />;
      case 'prompts':
        return <PromptManager />;
      case 'promocodes':
        return <PromoCodeManager />;
      case 'news':
        return <AdminNews />;
      default:
        return <AdminAnalytics users={users} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-wb-purple" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row w-full overflow-hidden">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <AdminSidebar 
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      )}
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-4 border-b shrink-0">
          <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1 overflow-hidden">
            {/* Mobile Menu */}
            {isMobile && (
              <AdminMobileMenu 
                activeTab={activeTab}
                onTabChange={handleTabChange}
              />
            )}
            <div className="min-w-0 flex-1 overflow-hidden">
              <h1 className="text-lg md:text-xl lg:text-2xl font-bold truncate">Админ-панель</h1>
              <p className="text-muted-foreground text-xs md:text-sm hidden sm:block truncate">Управление системой WB Генератор</p>
            </div>
          </div>
          <div className="flex gap-1 md:gap-2 shrink-0 ml-2">
            <DataExportDialog>
              <Button variant="outline" size={isMobile ? "sm" : "default"} className="gap-1 md:gap-2">
                <Download className="h-3 w-3 md:h-4 md:w-4" />
                {!isMobile && <span className="hidden lg:inline">Экспорт</span>}
              </Button>
            </DataExportDialog>
            <Button onClick={handleSignOut} variant="destructive" size={isMobile ? "sm" : "default"} className="gap-1 md:gap-2">
              <LogOut className="h-3 w-3 md:h-4 md:w-4" />
              {!isMobile && <span className="hidden lg:inline">Выйти</span>}
            </Button>
          </div>
        </div>
        
        <main className="flex-1 p-3 md:p-4 lg:p-6 overflow-x-hidden overflow-y-auto">
          <div className="w-full max-w-full">
            {renderContent()}
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
}