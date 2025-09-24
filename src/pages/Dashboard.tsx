import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MobileMenu } from "@/components/dashboard/MobileMenu";
import { useIsMobile } from "@/hooks/use-mobile";
import { OptimizedGenerateCards } from "@/components/dashboard/OptimizedGenerateCards";
import { GenerateCards } from "@/components/dashboard/GenerateCards";
import { GenerateDescription } from "@/components/dashboard/GenerateDescription";
import { History } from "@/components/dashboard/History";
import Balance from "@/components/dashboard/Balance";
import { Referrals } from "@/components/dashboard/Referrals";
import { Settings } from "@/components/dashboard/Settings";
import WBLabelMaker from "@/components/dashboard/WBLabelMaker";
import { NotificationCenter } from "@/components/dashboard/NotificationCenter";
import News from "@/pages/News";
import Learning from "@/pages/Learning";
import Footer from "@/components/Footer";
import { Loader2, Zap, UserIcon, User as UserIconName, LogOut } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  tokens_balance: number;
  wb_connected: boolean;
  referral_code: string;
}

type ActiveTab = 'generate' | 'description' | 'history' | 'balance' | 'referrals' | 'settings' | 'notifications' | 'barcode' | 'news' | 'learning';

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('generate');
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadProfile(session.user.id);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session?.user) {
          navigate("/auth");
          return;
        }
        setUser(session.user);
        
        // Defer profile loading to prevent potential deadlocks
        setTimeout(() => {
          loadProfile(session.user.id);
        }, 0);
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      toast({
        title: "Ошибка загрузки профиля",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      // Clean up auth state
      localStorage.clear();
      sessionStorage.clear();
      
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Ошибка выхода",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const refreshProfile = () => {
    if (user) {
      loadProfile(user.id);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as ActiveTab);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-wb-purple" />
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'generate':
        return <GenerateCards profile={profile} onTokensUpdate={refreshProfile} />;
      case 'description':
        return <GenerateDescription profile={profile} onTokensUpdate={refreshProfile} />;
      case 'barcode':
        return <WBLabelMaker />;
      case 'news':
        return <News />;
      case 'learning':
        return <Learning />;
      case 'history':
        return <History profile={profile} />;
      case 'balance':
        return <Balance />;
      case 'referrals':
        return <Referrals profile={profile} />;
      case 'settings':
        return <Settings profile={profile} onUpdate={refreshProfile} onSignOut={handleSignOut} />;
      case 'notifications':
        return <NotificationCenter profile={profile} />;
      default:
        return <GenerateCards profile={profile} onTokensUpdate={refreshProfile} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <DashboardSidebar 
          activeTab={activeTab}
          onTabChange={handleTabChange}
          profile={profile}
        />
      )}
      
      <div className="flex-1 flex flex-col">
        {/* Header with Mobile Menu */}
        <div className="flex items-center justify-between p-4 border-b md:hidden">
          <MobileMenu 
            activeTab={activeTab}
            onTabChange={handleTabChange}
            profile={profile}
          />
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-hero rounded-[12px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-base sm:text-lg font-semibold">WB Генератор</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-wb-purple text-white">
                    <UserIcon className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-background border shadow-lg" align="end" forceMount>
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium leading-none">
                  {profile.full_name || 'Пользователь'}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {profile.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setActiveTab('settings')}
                className="hover:bg-wb-purple/10"
              >
                <UserIconName className="mr-2 h-4 w-4" />
                <span>Настройки</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="hover:bg-wb-purple/10">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Выйти</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Desktop Header */}
        {!isMobile && (
          <DashboardHeader 
            profile={profile}
            onSignOut={handleSignOut}
          />
        )}
        
        <main className="flex-1 p-4 md:p-6">
          {renderContent()}
        </main>
        
        <Footer />
      </div>
    </div>
  );
};

export default Dashboard;