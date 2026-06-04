import { useState, useEffect, lazy, Suspense, useCallback, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { forceSignOut } from "@/lib/auth";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { useActiveJobs } from "@/hooks/useActiveJobs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useIsMobile } from "@/hooks/use-mobile";
import { NotificationCenter } from "@/components/dashboard/NotificationCenter";
import Footer from "@/components/Footer";
import { DashboardBanners } from "@/components/dashboard/DashboardBanners";
import { SystemStatusBanner } from "@/components/dashboard/SystemStatusBanner";
import { Loader2, Zap, UserIcon, User as UserIconName, LogOut, Handshake, Menu, Headphones, Filter, CheckCheck, Check, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Mobile components
import { MobileTabBar } from "@/components/mobile/MobileTabBar";
import { MobileSideMenu } from "@/components/mobile/MobileSideMenu";
import { PWAInstallPrompt } from "@/components/mobile/PWAInstallPrompt";
import { OnboardingSurvey } from "@/components/dashboard/OnboardingSurvey";
import { useNotifications } from "@/hooks/useNotifications";

// Lazy-loaded tab components
const GenerateCards = lazy(() => import("@/components/dashboard/GenerateCards").then(m => ({ default: m.GenerateCards })));
const GenerateDescription = lazy(() => import("@/components/dashboard/GenerateDescription").then(m => ({ default: m.GenerateDescription })));
const History = lazy(() => import("@/components/dashboard/History").then(m => ({ default: m.History })));
const Balance = lazy(() => import("@/components/dashboard/Balance"));
const Bonuses = lazy(() => import("@/components/dashboard/Bonuses").then(m => ({ default: m.Bonuses })));
const Settings = lazy(() => import("@/components/dashboard/Settings").then(m => ({ default: m.Settings })));
const LabelGenerator = lazy(() => import("@/components/dashboard/LabelGenerator"));
const News = lazy(() => import("@/pages/News"));
const VideoCovers = lazy(() => import("@/components/dashboard/VideoCovers").then(m => ({ default: m.VideoCovers })));
const Learning = lazy(() => import("@/pages/Learning"));
const SupportChat = lazy(() => import("@/components/support/SupportChat").then(m => ({ default: m.SupportChat })));

// Tab loading spinner
const TabLoader = () => (
  <div className="flex items-center justify-center min-h-[calc(100vh-200px)] md:min-h-[calc(100vh-180px)]">
    <div className="w-7 h-7 rounded-full border-[2.5px] border-primary/30 border-t-primary animate-[spin_0.7s_linear_infinite]" />
  </div>
);

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  tokens_balance: number;
  wb_connected: boolean;
  referral_code: string;
  login_count: number;
}
type ActiveTab = 'cards' | 'video' | 'description' | 'labels' | 'history' | 'pricing' | 'bonuses' | 'settings' | 'notifications' | 'news' | 'learning' | 'support';

const MOBILE_TAB_TITLES: Record<string, string> = {
  cards: 'Карточки',
  video: 'Видеообложки',
  description: 'Описания',
  labels: 'Этикетки',
  history: 'История',
  pricing: 'Баланс',
  bonuses: 'Бонусы',
  settings: 'Настройки',
  notifications: 'Уведомления',
  news: 'Новости',
  learning: 'Обучение',
  support: 'Поддержка',
};

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasUnreadNews, setHasUnreadNews] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('cards');
  const [shouldRefreshHistory, setShouldRefreshHistory] = useState(false);
  const [pendingVideoImageUrl, setPendingVideoImageUrl] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'cards' | 'description' | 'video'>('all');
  const newsMarkAllReadRef = useRef<(() => void) | null>(null);
  const notifMarkAllReadRef = useRef<(() => void) | null>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    toast
  } = useToast();
  const isMobile = useIsMobile();
  const {
    hasCompletedJobs,
    resetCompletedJobsFlag
  } = useActiveJobs(profile?.id || '');
  const { requestPermission, checkSupportMessages, checkNews } = useNotifications();

  // Request notification permission and start polling
  useEffect(() => {
    if (!profile?.id) return;
    
    // Request permission after a short delay
    const permTimer = setTimeout(() => {
      requestPermission();
    }, 5000);

    // Poll for new notifications every 30s
    const pollInterval = setInterval(() => {
      if (document.hidden) return; // Don't poll if tab not visible
      checkSupportMessages(profile.id);
      checkNews(profile.id);
    }, 30000);

    // Initial check
    checkSupportMessages(profile.id);
    checkNews(profile.id);

    return () => {
      clearTimeout(permTimer);
      clearInterval(pollInterval);
    };
  }, [profile?.id, requestPermission, checkSupportMessages, checkNews]);
  // Handle tab from URL query param or hash anchor
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const hashParam = window.location.hash.replace('#', '');
    
    const validTabs = ['cards', 'video', 'description', 'labels', 'history', 'pricing', 'bonuses', 'settings', 'notifications', 'news', 'learning', 'support'];
    
    // Priority: query param > hash anchor
    const targetTab = tabParam || hashParam;
    
    if (targetTab && validTabs.includes(targetTab)) {
      setActiveTab(targetTab as ActiveTab);
      // Clear the query param after setting the tab
      if (tabParam) {
        setSearchParams({}, { replace: true });
      }
      // Clear the hash
      if (hashParam) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, [searchParams, setSearchParams]);


  const profileLoadingRef = useRef<string | null>(null);
  const loadedProfileForRef = useRef<string | null>(null);
  const profileMissingToastShown = useRef(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
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
        if (event === 'SIGNED_OUT') navigate("/auth");
        return;
      }
      setUser(prev => {
        if (prev?.id === session.user.id) return prev;
        setTimeout(() => loadProfile(session.user.id), 0);
        return session.user;
      });
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate]);
  const loadProfile = async (userId: string, attempt = 0) => {
    // Prevent concurrent loads for same user
    if (attempt === 0 && profileLoadingRef.current === userId) return;
    if (attempt === 0 && loadedProfileForRef.current === userId) return;
    profileLoadingRef.current = userId;
    try {
      const {
        data,
        error
      } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error) throw error;
      if (!data) {
        if (attempt < 5) {
          if (!profileMissingToastShown.current) {
            profileMissingToastShown.current = true;
            toast({
              title: "Профиль загружается",
              description: "Подождите немного, профиль создаётся..."
            });
          }
          setTimeout(() => loadProfile(userId, attempt + 1), 2000);
          return;
        }
        toast({
          title: "Не удалось загрузить профиль",
          description: "Обновите страницу или напишите в поддержку",
          variant: "destructive"
        });
        setLoading(false);
        profileLoadingRef.current = null;
        return;
      }
      profileMissingToastShown.current = false;
      loadedProfileForRef.current = userId;
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
        description: "Не удалось загрузить данные профиля",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      profileLoadingRef.current = null;
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
            referred_by: referrerData.id
          }).eq('id', userId);
          if (!updateError) {
            await supabase.from('referrals').insert({
              referrer_id: referrerData.id,
              referred_id: userId,
              status: 'pending'
            });
            toast({
              title: "Реферальная ссылка применена! 🎉",
              description: "Вы и ваш друг получите по 15 токенов после вашей первой оплаты"
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

      // Process pending UTM source (from Google OAuth).
      // Prefer the value from redirect URL (?utm_source_id=…) — survives
      // cross-tab OAuth flows where sessionStorage would be lost.
      const urlUtmSourceId = new URLSearchParams(window.location.search).get('utm_source_id');
      const pendingUtmSourceId = urlUtmSourceId || sessionStorage.getItem('pending_utm_source_id');
      if (pendingUtmSourceId && !profileData.utm_source_id) {
        await supabase.from('profiles').update({ utm_source_id: pendingUtmSourceId }).eq('id', userId);
      }
      sessionStorage.removeItem('pending_utm_source_id');
      if (urlUtmSourceId) {
        const url = new URL(window.location.href);
        url.searchParams.delete('utm_source_id');
        window.history.replaceState({}, '', url.toString());
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
    await forceSignOut();
  };
  const refreshProfile = () => {
    if (user) {
      loadedProfileForRef.current = null;
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
  const headerActions = useMemo(() => {
    return null;
  }, [activeTab]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-[2.5px] border-violet-500/30 border-t-violet-500 animate-[spin_0.7s_linear_infinite]" />
      </div>;
  }
  if (!user || !profile) {
    return null;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'cards':
        return <GenerateCards 
          profile={profile} 
          onTokensUpdate={refreshProfile} 
          onNavigateToBalance={() => handleTabChange('pricing')}
          onNavigateToLearning={() => handleTabChange('learning')}
          onNavigateToVideo={(imageUrl) => {
            setPendingVideoImageUrl(imageUrl);
            handleTabChange('video');
          }}
        />;
      case 'video':
        return <VideoCovers profile={profile} onTokensUpdate={refreshProfile} onNavigate={handleTabChange} preAttachedImageUrl={pendingVideoImageUrl} onPreAttachedImageConsumed={() => setPendingVideoImageUrl(null)} />;
      case 'description':
        return <GenerateDescription profile={profile} onTokensUpdate={refreshProfile} onNavigateToBalance={() => handleTabChange('pricing')} />;
      case 'notifications':
        return <NotificationCenter profile={profile} onMarkAllReadRef={notifMarkAllReadRef} />;
      case 'labels':
        return <LabelGenerator />;
      case 'history':
        return <History profile={profile} shouldRefresh={shouldRefreshHistory} onRefreshComplete={handleHistoryRefreshComplete} onTokensUpdate={refreshProfile} filter={historyFilter} onFilterChange={setHistoryFilter} />;
      case 'pricing':
        return <Balance />;
      case 'bonuses':
        return <Bonuses profile={profile} />;
      case 'news':
        return <News onMarkAllReadRef={newsMarkAllReadRef} />;

      case 'learning':
        return <Learning />;
      case 'support':
        return <SupportChat profile={profile} />;
      case 'settings':
        return <Settings profile={profile} onUpdate={refreshProfile} onSignOut={handleSignOut} onNavigateToSupport={() => setActiveTab('support')} />;
      default:
        return <GenerateCards 
          profile={profile} 
          onTokensUpdate={refreshProfile} 
          onNavigateToBalance={() => handleTabChange('pricing')}
          onNavigateToLearning={() => handleTabChange('learning')}
          onNavigateToVideo={(imageUrl) => {
            setPendingVideoImageUrl(imageUrl);
            handleTabChange('video');
          }}
        />;
    }
  };
  return <div className="min-h-screen bg-background flex">
      {/* PWA Install Prompt - Mobile only */}
      {profile && isMobile && <PWAInstallPrompt userId={profile.id} loginCount={profile.login_count || 0} />}
      
      {/* Onboarding Survey - shows once on first login */}
      {profile && <OnboardingSurvey userId={profile.id} onComplete={() => {}} />}
      
      {/* Mobile Side Menu */}
      {isMobile && <MobileSideMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} activeTab={activeTab} onTabChange={handleTabChange} profile={profile} hasUnreadNews={hasUnreadNews} />}
      
      {/* Desktop Sidebar */}
      {!isMobile && <div className="sticky top-0 h-screen">
          <DashboardSidebar activeTab={activeTab} onTabChange={handleTabChange} profile={profile} />
        </div>}
      
      <div className="flex-1 flex flex-col min-h-screen md:overflow-y-auto min-w-0 overflow-x-hidden">
        {/* Mobile Header */}
         {isMobile && <header className="border-b border-border/60 bg-card/95 backdrop-blur-md fixed top-0 left-0 right-0 z-30">
            <div className="flex h-14 items-center gap-2 px-3">
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-violet-500/10 hover:text-violet-600 active:scale-95 transition-all shrink-0" onClick={() => setMobileMenuOpen(true)} aria-label="Меню">
                <Menu className="h-5 w-5" />
              </Button>

              <h1 className="text-[15px] font-semibold tracking-tight truncate flex-1 min-w-0">
                {MOBILE_TAB_TITLES[activeTab] || 'WBGen'}
              </h1>

              <button
                onClick={() => handleTabChange('pricing')}
                className="group inline-flex items-center gap-1.5 h-9 px-2.5 rounded-xl bg-gradient-to-br from-violet-500/15 via-purple-500/10 to-transparent border border-violet-500/25 hover:border-violet-500/50 active:scale-95 transition-all shrink-0"
                aria-label="Баланс токенов"
              >
                <Sparkles className="h-3.5 w-3.5 text-violet-500 dark:text-violet-300 shrink-0" />
                <span className="text-[13px] font-extrabold tabular-nums leading-none bg-gradient-to-br from-violet-600 to-purple-600 dark:from-violet-200 dark:to-purple-300 bg-clip-text text-transparent">
                  {(profile.tokens_balance ?? 0).toLocaleString('ru-RU')}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground leading-none">ток.</span>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-xl hover:bg-violet-500/10 active:scale-95 transition-all shrink-0 p-0" aria-label="Профиль">
                    <Avatar className="h-8 w-8 ring-2 ring-violet-500/20">
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white font-semibold text-xs">
                        {(profile.full_name?.[0] || profile.email?.[0] || 'U').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 bg-card border shadow-xl rounded-xl" align="end" forceMount sideOffset={8}>
                  <div className="flex items-center gap-3 p-3">
                    <Avatar className="h-10 w-10 ring-2 ring-violet-500/20">
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white font-semibold text-sm">
                        {(profile.full_name?.[0] || profile.email?.[0] || 'U').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">
                        {profile.full_name || 'Пользователь'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {profile.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <button
                    onClick={() => handleTabChange('pricing')}
                    className="w-full mx-1 my-0.5 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-500/[0.08] to-purple-500/[0.06] hover:from-violet-500/[0.12] hover:to-purple-500/[0.10] border border-violet-500/15 transition-colors"
                    style={{ width: 'calc(100% - 8px)' }}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-violet-300" />
                      <span className="text-xs text-muted-foreground">Баланс</span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-violet-700 dark:text-violet-300">
                      {(profile.tokens_balance ?? 0).toLocaleString('ru-RU')}
                    </span>
                  </button>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/partners/cabinet')} className="hover:bg-violet-500/10 hover:text-violet-600 focus:bg-violet-500/10 focus:text-violet-600 cursor-pointer rounded-lg mx-1">
                    <Handshake className="mr-2 h-4 w-4" />
                    <span>Партнёрам</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab('support')} className="hover:bg-violet-500/10 hover:text-violet-600 focus:bg-violet-500/10 focus:text-violet-600 cursor-pointer rounded-lg mx-1">
                    <Headphones className="mr-2 h-4 w-4" />
                    <span>Поддержка</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab('settings')} className="hover:bg-violet-500/10 hover:text-violet-600 focus:bg-violet-500/10 focus:text-violet-600 cursor-pointer rounded-lg mx-1">
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
            </div>
         </header>}

        {/* Desktop Header */}
        {!isMobile && <DashboardHeader profile={profile} activeTab={activeTab} onSignOut={handleSignOut} onNavigateToSettings={() => setActiveTab('settings')} onNavigateToSupport={() => setActiveTab('support')} onNavigateToBalance={() => handleTabChange('pricing')} headerActions={headerActions} />}

        <main className={`flex-1 p-3 md:p-4 lg:p-6 overflow-x-hidden min-w-0 ${isMobile ? 'pt-[68px] pb-24' : ''}`}>
          <SystemStatusBanner />
          <DashboardBanners userId={profile.id} />
          <Suspense fallback={<TabLoader />}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full max-w-full"
            >
              {renderContent()}
            </motion.div>
          </Suspense>
        </main>

        {!isMobile && <Footer />}
      </div>

      
      {/* Mobile Tab Bar */}
      {isMobile && <MobileTabBar activeTab={activeTab} onTabChange={handleTabChange} />}
    </div>;
};
export default Dashboard;
