import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { GenerateCards } from "@/components/dashboard/GenerateCards";
import { GenerateDescription } from "@/components/dashboard/GenerateDescription";
import { History } from "@/components/dashboard/History";
import { Pricing } from "@/components/dashboard/Pricing";
import { Referrals } from "@/components/dashboard/Referrals";
import { Settings } from "@/components/dashboard/Settings";
import { Loader2 } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  tokens_balance: number;
  wb_connected: boolean;
  referral_code: string;
}

type ActiveTab = 'cards' | 'description' | 'history' | 'pricing' | 'referrals' | 'settings';

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('cards');
  const navigate = useNavigate();
  const { toast } = useToast();

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
      case 'cards':
        return <GenerateCards profile={profile} onTokensUpdate={refreshProfile} />;
      case 'description':
        return <GenerateDescription profile={profile} onTokensUpdate={refreshProfile} />;
      case 'history':
        return <History />;
      case 'pricing':
        return <Pricing profile={profile} onTokensUpdate={refreshProfile} />;
      case 'referrals':
        return <Referrals profile={profile} />;
      case 'settings':
        return <Settings profile={profile} onUpdate={refreshProfile} onSignOut={handleSignOut} />;
      default:
        return <GenerateCards profile={profile} onTokensUpdate={refreshProfile} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
        <DashboardSidebar 
          activeTab={activeTab}
          onTabChange={handleTabChange}
          profile={profile}
        />
      
      <div className="flex-1 flex flex-col">
        <DashboardHeader 
          profile={profile}
          onSignOut={handleSignOut}
        />
        
        <main className="flex-1 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;