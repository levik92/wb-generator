import { useEffect, useState, useRef } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "@/hooks/use-toast";
import { forceSignOut } from "@/lib/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          checkBlocked(session.user.id);
          // Track user activity
          if (event === 'SIGNED_IN') {
            // Real login: increment login_count + update last_active_at
            supabase.rpc('update_profile_on_login' as any, { user_id_param: session.user.id });
          } else if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
            // Returning user with valid session: only touch last_active_at (throttled to 10 min)
            supabase.rpc('touch_profile_activity' as any, { user_id_param: session.user.id });
          }
        } else {
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkBlocked(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkBlocked = async (userId: string) => {
    try {
      // Принудительно валидируем сессию: supabase-js при необходимости обновит access token.
      // Если refresh token мёртвый — getSession вернёт null и мы выйдем из аккаунта.
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        await forceSignOut();
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('is_blocked')
        .eq('id', userId)
        .single();

      if (error) {
        // JWT истёк / невалиден — выкидываем на /auth, чтобы пользователь перелогинился
        const code = (error as any)?.code;
        const msg = (error as any)?.message?.toLowerCase?.() ?? '';
        if (code === 'PGRST303' || msg.includes('jwt expired') || msg.includes('invalid jwt')) {
          await forceSignOut();
          return;
        }
        console.error('Error checking block status:', error);
      } else if (data?.is_blocked) {
        setIsBlocked(true);
        toast({
          title: "Аккаунт заблокирован",
          description: "Ваш аккаунт был заблокирован администратором",
          variant: "destructive"
        });
        await forceSignOut();
      }
    } catch (e) {
      console.error('Error checking block status:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-[2.5px] border-primary/30 border-t-primary animate-[spin_0.7s_linear_infinite]" />
      </div>
    );
  }

  if (!user || isBlocked) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};