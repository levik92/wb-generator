import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { useActiveJobs } from "@/hooks/useActiveJobs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useIsMobile } from "@/hooks/use-mobile";
import { GenerateCards } from "@/components/dashboard/GenerateCards";
import { GenerateDescription } from "@/components/dashboard/GenerateDescription";
import { History } from "@/components/dashboard/History";
import Balance from "@/components/dashboard/Balance";
import { Referrals } from "@/components/dashboard/Referrals";
import { Settings } from "@/components/dashboard/Settings";
import LabelGenerator from "@/components/dashboard/LabelGenerator";
import { NotificationCenter } from "@/components/dashboard/NotificationCenter";
import News from "@/pages/News";
import Learning from "@/pages/Learning";
import Footer from "@/components/Footer";
import { DashboardBanners } from "@/components/dashboard/DashboardBanners";
import { Loader2, Zap, UserIcon, User as UserIconName, LogOut, Handshake, Menu } from "lucide-react";

// Mobile components
import { MobileTabBar } from "@/components/mobile/MobileTabBar";
import { MobileSideMenu } from "@/components/mobile/MobileSideMenu";
import { PWAInstallPrompt } from "@/components/mobile/PWAInstallPrompt";
import { OnboardingWizard } from "@/components/mobile/OnboardingWizard";
interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  tokens_balance: number;
  wb_connected: boolean;
  referral_code: string;
  login_count: number;
}
type ActiveTab = 'cards' | 'description' | 'labels' | 'history' | 'pricing' | 'referrals' | 'settings' | 'notifications' | 'news' | 'learning';
const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasUnreadNews, setHasUnreadNews] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('cards');
  const [shouldRefreshHistory, setShouldRefreshHistory] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const isMobile = useIsMobile();
  const {
    hasCompletedJobs,
    resetCompletedJobsFlag
  } = useActiveJobs(profile?.id || '');
  useEffect(() => {
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadProfile(session.user.id);
    });
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      setTimeout(() => {
        loadProfile(session.user.id);
      }, 0);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);
  const loadProfile = async (userId: string) => {
    try {
      const {
        data,
        error
      } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error) throw error;
      if (!data) {
        toast({
          title: "Профиль загружается",
          description: "Подождите немного, профиль создаётся..."
        });
        setTimeout(() => loadProfile(userId), 2000);
        return;
      }
      const currentLoginCount = data.login_count || 0;
      if (currentLoginCount < 3) {
        await supabase.from('profiles').update({
          login_count: currentLoginCount + 1
        }).eq('id', userId);
        data.login_count = currentLoginCount + 1;
      }
      setProfile(data);
      await checkUnreadNews(userId);
      await processPendingCodes(userId, data);
    } catch (error: any) {
      toast({
        title: "Ошибка загрузки профиля",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const processPendingCodes = async (userId: string, profileData: any) => {
    try {
      const pendingReferralCode = sessionStorage.getItem('pending_referral_code');
      const pendingPartnerCode = sessionStorage.getItem('pending_partner_code');
      if (pendingReferralCode && !profileData.referred_by) {
        const {
          data: referrerData,
          error: referrerError
        } = await supabase.from('profiles').select('id').eq('referral_code', pendingReferralCode).single();
        if (!referrerError && referrerData && referrerData.id !== userId) {
          const {
            error: updateError
          } = await supabase.from('profiles').update({
            referred_by: referrerData.id,
            tokens_balance: profileData.tokens_balance + 10
          }).eq('id', userId);
          if (!updateError) {
            await supabase.from('referrals').insert({
              referrer_id: referrerData.id,
              referred_id: userId,
              status: 'pending'
            });
            await supabase.from('token_transactions').insert({
              user_id: userId,
              amount: 10,
              transaction_type: 'referral_bonus',
              description: 'Бонус за регистрацию по реферальной ссылке'
            });
            toast({
              title: "Реферальный бонус начислен! 🎉",
              description: "Вы получили дополнительные 10 токенов"
            });
          }
        }
        sessionStorage.removeItem('pending_referral_code');
      }
      if (pendingPartnerCode) {
        const {
          data,
          error
        } = await supabase.functions.invoke('process-partner-signup', {
          body: {
            user_id: userId,
            partner_code: pendingPartnerCode
          }
        });
        if (!error) {
          toast({
            title: "Добро пожаловать! 🎉",
            description: "Вы зарегистрированы по партнерской ссылке"
          });
        }
        sessionStorage.removeItem('pending_partner_code');
      }
    } catch (error) {
      console.error('Error processing pending codes:', error);
    }
  };
  const checkUnreadNews = async (userId: string) => {
    try {
      const {
        data: newsData
      } = await (supabase as any).from('news').select('id, published_at').eq('is_published', true).order('published_at', {
        ascending: false
      }).limit(5);
      if (newsData && newsData.length > 0) {
        const {
          data: readData
        } = await (supabase as any).from('news_read_status').select('news_id').eq('user_id', userId);
        const readIds = new Set((readData as any)?.map((r: any) => r.news_id) || []);
        const hasUnread = (newsData as any).some((news: any) => !readIds.has(news.id));
        setHasUnreadNews(hasUnread);
      }
    } catch (error) {
      console.error('Error checking unread news:', error);
    }
  };
  const handleSignOut = async () => {
    try {
      const {
        error
      } = await supabase.auth.signOut({
        scope: 'global'
      });
      if (error) throw error;
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Ошибка выхода",
        description: error.message,
        variant: "destructive"
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
  useEffect(() => {
    if (hasCompletedJobs) {
      setShouldRefreshHistory(true);
    }
  }, [hasCompletedJobs]);
  const handleHistoryRefreshComplete = () => {
    setShouldRefreshHistory(false);
    resetCompletedJobsFlag();
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
            <Zap className="w-6 h-6 text-white animate-pulse" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>;
  }
  if (!user || !profile) {
    return null;
  }
  const renderContent = () => {
    switch (activeTab) {
      case 'cards':
        return <GenerateCards profile={profile} onTokensUpdate={refreshProfile} />;
      case 'description':
        return <GenerateDescription profile={profile} onTokensUpdate={refreshProfile} />;
      case 'notifications':
        return <NotificationCenter profile={profile} />;
      case 'labels':
        return <LabelGenerator />;
      case 'history':
        return <History profile={profile} shouldRefresh={shouldRefreshHistory} onRefreshComplete={handleHistoryRefreshComplete} />;
      case 'pricing':
        return <Balance />;
      case 'referrals':
        return <Referrals profile={profile} />;
      case 'news':
        return <News />;
      case 'learning':
        return <Learning />;
      case 'settings':
        return <Settings profile={profile} onUpdate={refreshProfile} onSignOut={handleSignOut} />;
      default:
        return <GenerateCards profile={profile} onTokensUpdate={refreshProfile} onNavigateToBalance={() => handleTabChange('balance')} />;
    }
  };
  return <div className="min-h-screen bg-background flex">
      {/* PWA Install Prompt - Mobile only */}
      {profile && isMobile && <PWAInstallPrompt userId={profile.id} loginCount={profile.login_count || 0} />}
      
      {/* Onboarding Wizard */}
      {profile && <OnboardingWizard userId={profile.id} loginCount={profile.login_count || 0} onComplete={() => {}} onSkip={() => {}} />}
      
      {/* Mobile Side Menu */}
      {isMobile && <MobileSideMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} activeTab={activeTab} onTabChange={handleTabChange} profile={profile} hasUnreadNews={hasUnreadNews} />}
      
      {/* Desktop Sidebar */}
      {!isMobile && <div className="sticky top-0 h-screen">
          <DashboardSidebar activeTab={activeTab} onTabChange={handleTabChange} profile={profile} />
        </div>}
      
      <div className="flex-1 flex flex-col min-h-screen md:overflow-y-auto">
        {/* Mobile Header */}
        {isMobile && <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card/80 backdrop-blur-xl z-30">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-primary/10 hover:bg-primary/20" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="h-5 w-5 text-primary" />
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-base font-bold">WBGen</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-xl hover:bg-secondary">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                      <UserIcon className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-card border shadow-xl rounded-xl" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-3">
                  <p className="text-sm font-semibold leading-none">
                    {profile.full_name || 'Пользователь'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {profile.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/partner')} className="hover:bg-primary/5 cursor-pointer rounded-lg mx-1">
                  <Handshake className="mr-2 h-4 w-4" />
                  <span>Партнёрам</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('settings')} className="hover:bg-primary/5 cursor-pointer rounded-lg mx-1">
                  <UserIconName className="mr-2 h-4 w-4" />
                  <span>Настройки</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="hover:bg-destructive/10 text-destructive cursor-pointer rounded-lg mx-1">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Выйти</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>}
        
        {/* Desktop Header */}
        {!isMobile && <DashboardHeader profile={profile} onSignOut={handleSignOut} onNavigateToSettings={() => setActiveTab('settings')} />}
        
        <main className={`flex-1 p-4 md:p-6 ${isMobile ? 'pb-24' : ''}`}>
          <DashboardBanners userId={profile.id} />
          {renderContent()}
        </main>
        
        {!isMobile && <Footer />}
      </div>
      
      {/* Mobile Tab Bar */}
      {isMobile && <MobileTabBar activeTab={activeTab} onTabChange={handleTabChange} />}
    </div>;
};
export default Dashboard;