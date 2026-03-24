import { useEffect, useState, useRef } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";


interface AuthRedirectProps {
  children: React.ReactNode;
}

export const AuthRedirect = ({ children }: AuthRedirectProps) => {
  // Fast path: if no stored session, render children immediately
  // Use try/catch for TMA/WebView where localStorage may be unavailable
  const hasStoredSession = (() => {
    try {
      const keys = Object.keys(localStorage);
      return keys.some(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    } catch {
      // localStorage unavailable (TMA/WebView) — must do async check
      return true;
    }
  })();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(hasStoredSession);
  const [searchParams] = useSearchParams();
  const initialized = useRef(false);

  useEffect(() => {
    // If no stored session, skip auth check entirely
    if (!hasStoredSession) return;
    
    // Prevent double initialization in React StrictMode
    if (initialized.current) return;
    initialized.current = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-[2.5px] border-primary/30 border-t-primary animate-[spin_0.7s_linear_infinite]" />
      </div>
    );
  }

  // If user is authenticated, redirect to dashboard
  // BUT: don't redirect if user is on password reset flow
  if (user) {
    const isPasswordReset = searchParams.get('tab') === 'reset-password';
    if (!isPasswordReset) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};
