import { useEffect, useState, useRef } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
      const { data, error } = await supabase
        .from('profiles')
        .select('is_blocked')
        .eq('id', userId)
        .single();

      if (!error && data?.is_blocked) {
        setIsBlocked(true);
        toast({
          title: "Аккаунт заблокирован",
          description: "Ваш аккаунт был заблокирован администратором",
          variant: "destructive"
        });
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.error('Error checking block status:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-wb-purple" />
      </div>
    );
  }

  if (!user || isBlocked) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};