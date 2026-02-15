import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export interface PaymentPackage {
  id: string;
  name: string;
  price: number;
  tokens: number;
  currency: string;
  is_active: boolean;
  is_popular: boolean;
  is_trial: boolean;
  created_at: string;
}

interface UsePaymentPackagesOptions {
  requireAuth?: boolean;
}

export const usePaymentPackages = (options: UsePaymentPackagesOptions = {}) => {
  const { requireAuth = true } = options;
  const [isAuthReady, setIsAuthReady] = useState(!requireAuth);

  useEffect(() => {
    if (!requireAuth) {
      setIsAuthReady(true);
      return;
    }

    // Wait for auth to be ready before enabling the query
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthReady(true);
      }
    };
    
    checkAuth();

    // Also listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setIsAuthReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [requireAuth]);

  return useQuery({
    queryKey: ['payment-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_packages')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      return data as PaymentPackage[];
    },
    enabled: isAuthReady, // Only run query when auth is ready
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 3, // Retry up to 3 times on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};
