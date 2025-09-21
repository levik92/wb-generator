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

type ActiveTab = 'analytics' | 'users' | 'prompts' | 'promocodes' | 'news';

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
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

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
      case 'prompts':
        return <PromptManager />;
      case 'promocodes':
        return <PromoCodeManager />;
      case 'news':
        return (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">Раздел "Новости" в разработке</h3>
            <p className="text-muted-foreground">Скоро здесь появится возможность управления новостями</p>
          </div>
        );
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
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <AdminSidebar 
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      )}
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            {/* Mobile Menu */}
            {isMobile && (
              <AdminMobileMenu 
                activeTab={activeTab}
                onTabChange={handleTabChange}
              />
            )}
            <div>
              <h1 className="text-2xl font-bold">Админ-панель</h1>
              <p className="text-muted-foreground">Управление системой WB Генератор</p>
            </div>
          </div>
          <div className="flex gap-2">
            <DataExportDialog>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                {!isMobile && "Экспорт данных"}
              </Button>
            </DataExportDialog>
            <Button onClick={handleSignOut} variant="destructive" className="gap-2">
              <LogOut className="h-4 w-4" />
              {!isMobile && "Выйти"}
            </Button>
          </div>
        </div>
        
        <main className="flex-1 p-6 md:p-6 p-4">
          {renderContent()}
        </main>
        
        <Footer />
      </div>
    </div>
  );
}