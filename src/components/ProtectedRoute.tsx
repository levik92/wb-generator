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

    // Hard safety: never let the loading spinner show longer than 8s.
    // If anything hangs (network, proxy, expired refresh token), kick to /auth.
    const safetyTimer = setTimeout(() => {
      if (loading) {
        console.warn('[ProtectedRoute] Auth check timed out, forcing sign out');
        forceSignOut();
      }
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          checkBlocked(session.user.id);
          if (event === 'SIGNED_IN') {
            supabase.rpc('update_profile_on_login' as any, { user_id_param: session.user.id });
          } else if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
            supabase.rpc('touch_profile_activity' as any, { user_id_param: session.user.id });
          }
        } else if (event === 'SIGNED_OUT') {
          setLoading(false);
        }
      }
    );

    (async () => {
      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          5000,
          'getSession'
        );
        setUser(session?.user ?? null);
        if (session?.user) {
          checkBlocked(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.error('[ProtectedRoute] getSession failed:', e);
        // Session unrecoverable — clear and bounce.
        await forceSignOut();
      }
    })();

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const checkBlocked = async (userId: string) => {
    try {
      let { data, error } = await withTimeout(
        supabase.from('profiles').select('is_blocked').eq('id', userId).single(),
        6000,
        'profiles.select'
      );

      if (error) {
        const code = (error as any)?.code;
        const msg = (error as any)?.message?.toLowerCase?.() ?? '';
        const isJwtError = code === 'PGRST303' || msg.includes('jwt expired') || msg.includes('invalid jwt');
        if (isJwtError) {
          let refreshed: any = null;
          try {
            const res = await withTimeout(
              supabase.auth.refreshSession(),
              5000,
              'refreshSession'
            );
            refreshed = res.data;
          } catch (refreshErr) {
            console.warn('[ProtectedRoute] refreshSession failed:', refreshErr);
          }

          if (refreshed?.session) {
            const retry = await withTimeout(
              supabase.from('profiles').select('is_blocked').eq('id', userId).single(),
              6000,
              'profiles.retry'
            );
            data = retry.data;
            error = retry.error;
          } else {
            // Refresh token is dead — boot to /auth immediately.
            await forceSignOut();
            return;
          }
        }
      }

      if (error) {
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