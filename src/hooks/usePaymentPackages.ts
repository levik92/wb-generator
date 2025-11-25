import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PaymentPackage {
  id: string;
  name: string;
  price: number;
  tokens: number;
  currency: string;
  is_active: boolean;
  created_at: string;
}

export const usePaymentPackages = () => {
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
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};
