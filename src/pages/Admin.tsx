import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { LogOut, Download, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminMobileMenu } from "@/components/admin/AdminMobileMenu";
import { AdminAnalytics } from "@/components/admin/AdminAnalytics";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { PromptManager } from "@/components/dashboard/PromptManager";
import { DataExportDialog } from "@/components/dashboard/DataExportDialog";
import { AdminBonuses } from "@/components/admin/AdminBonuses";
import { AdminNews } from "@/components/admin/AdminNews";
import { AdminPartners } from "@/components/admin/AdminPartners";
import { AdminPricing } from "@/components/admin/AdminPricing";
import { AdminBanners } from "@/components/admin/AdminBanners";
import { AdminBlog } from "@/components/admin/AdminBlog";
import { useIsMobile } from "@/hooks/use-mobile";
import Footer from "@/components/Footer";
import { UserIcon } from "lucide-react";
import { motion } from "framer-motion";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  tokens_balance: number;
  wb_connected: boolean;
  is_blocked: boolean;
  created_at: string;
  referral_code: string;
  updated_at: string;
}

type ActiveTab = 'analytics' | 'users' | 'partners' | 'prompts' | 'bonuses' | 'news' | 'pricing' | 'banners' | 'blog';

const TAB_TITLES: Record<ActiveTab, { title: string; subtitle: string }> = {
  analytics: { title: 'Аналитика', subtitle: 'Статистика и метрики платформы' },
  users: { title: 'Пользователи', subtitle: 'Управление пользователями' },
  partners: { title: 'Партнеры', subtitle: 'Партнерская программа' },
  prompts: { title: 'Модель', subtitle: 'Настройка AI-промптов' },
  bonuses: { title: 'Бонусы', subtitle: 'Бонусные программы' },
  news: { title: 'Новости', subtitle: 'Управление новостями' },
  pricing: { title: 'Цены', subtitle: 'Тарифы и пакеты' },
  banners: { title: 'Баннеры', subtitle: 'Баннеры дашборда' },
  blog: { title: 'Блог', subtitle: 'Статьи и публикации' },
};

export default function Admin() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('analytics');
  const [adminEmail, setAdminEmail] = useState('');
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
      setAdminEmail(session.user.email || '');
      const { data: userRoles, error } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).eq('role', 'admin').single();
      if (error || !userRoles) {
        toast({ title: "Доступ запрещен", description: "У вас нет прав администратора", variant: "destructive" });
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
    try {
      const allUsers: User[] = [];
      let offset = 0;
      const limit = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, tokens_balance, referral_code, wb_connected, is_blocked, created_at, updated_at')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        if (error) {
          const { data: rpcData, error: rpcError } = await supabase.rpc('admin_get_all_users');
          if (rpcError) throw rpcError;
          setUsers(rpcData || []);
          return;
        }
        if (data && data.length > 0) {
          allUsers.push(...data);
          offset += limit;
          hasMore = data.length === limit;
        } else {
          hasMore = false;
        }
      }
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({ title: "Ошибка", description: "Не удалось загрузить пользователей", variant: "destructive" });
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
      case 'analytics': return <AdminAnalytics users={users} />;
      case 'users': return <AdminUsers users={users} onUsersUpdate={loadUsers} />;
      case 'partners': return <AdminPartners />;
      case 'prompts': return <PromptManager />;
      case 'bonuses': return <AdminBonuses />;
      case 'news': return <AdminNews />;
      case 'pricing': return <AdminPricing />;
      case 'banners': return <AdminBanners />;
      case 'blog': return <AdminBlog />;
      default: return <AdminAnalytics users={users} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const currentTab = TAB_TITLES[activeTab];

  return (
    <div className="min-h-screen bg-background flex">
      {!isMobile && (
        <div className="sticky top-0 h-screen">
          <AdminSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-screen md:overflow-y-auto">
        {/* Header - matches DashboardHeader */}
        <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex h-[76px] items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1 overflow-hidden">
              {isMobile && <AdminMobileMenu activeTab={activeTab} onTabChange={handleTabChange} />}
              <div className="min-w-0 flex-1 overflow-hidden">
                <h1 className="text-lg md:text-xl font-bold text-foreground truncate">{currentTab.title}</h1>
                <p className="text-xs text-muted-foreground hidden sm:block truncate">{currentTab.subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-2">
              <ThemeToggle />
              
              <DataExportDialog>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-secondary">
                  <Download className="h-[18px] w-[18px] text-muted-foreground" />
                </Button>
              </DataExportDialog>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className={`relative rounded-xl ${isMobile ? 'h-9 w-9' : 'h-10 w-10'} hover:bg-secondary`}>
                    <Avatar className={isMobile ? 'h-8 w-8' : 'h-9 w-9'}>
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold">
                        <UserIcon className={isMobile ? 'h-4 w-4' : 'h-[18px] w-[18px]'} />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-card border shadow-xl rounded-xl" align="end" forceMount>
                  <div className="flex flex-col space-y-1 p-3">
                    <p className="text-sm font-semibold leading-none">Администратор</p>
                    <p className="text-xs leading-none text-muted-foreground">{adminEmail}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="hover:bg-primary/5 cursor-pointer rounded-lg mx-1" onClick={() => navigate('/dashboard')}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Дашборд</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="hover:bg-destructive/10 text-destructive cursor-pointer rounded-lg mx-1">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Выйти</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 p-3 md:p-4 lg:p-6 overflow-x-hidden overflow-y-auto">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-full"
          >
            {renderContent()}
          </motion.div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
