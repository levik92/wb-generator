import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionPackage {
  id: string;
  name: string;
  price: number;
  tokens_per_month: number;
  duration_days: number;
  features: Record<string, unknown>;
  can_download: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  package_id: string;
  status: 'active' | 'expired' | 'cancelled';
  started_at: string;
  expires_at: string;
  tokens_remaining: number;
  created_at: string;
  updated_at: string;
  subscription_packages?: SubscriptionPackage;
}

export interface SubscriptionStatus {
  status: 'legacy' | 'subscribed' | 'trial';
  tokens_balance: number;
  subscription?: UserSubscription;
  package_name?: string;
  expires_at?: string;
  can_download: boolean;
  trial_photos_remaining?: number;
  trial_descriptions_remaining?: number;
}

export const useSubscription = () => {
  return useQuery({
    queryKey: ['user-subscription'],
    queryFn: async (): Promise<SubscriptionStatus> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return {
          status: 'trial',
          tokens_balance: 0,
          can_download: false,
          trial_photos_remaining: 3,
          trial_descriptions_remaining: 3
        };
      }

      // Get user profile to check if legacy user
      const { data: profile } = await supabase
        .from('profiles')
        .select('tokens_balance, created_at')
        .eq('id', session.user.id)
        .single();

      // Check for active subscription - types may not be updated yet
      const { data: subscriptions } = await (supabase.rpc as any)(
        'get_user_subscription_status', 
        { user_id_param: session.user.id }
      );

      if (subscriptions && subscriptions.status === 'subscribed') {
        return {
          status: 'subscribed',
          tokens_balance: subscriptions.tokens_balance || 0,
          package_name: subscriptions.package_name,
          expires_at: subscriptions.expires_at,
          can_download: subscriptions.can_download ?? true
        };
      }

      if (subscriptions && subscriptions.status === 'legacy') {
        return {
          status: 'legacy',
          tokens_balance: subscriptions.tokens_balance || profile?.tokens_balance || 0,
          can_download: true
        };
      }

      // Trial user
      const trialPhotosRemaining = subscriptions?.trial_photos_remaining ?? 3;
      const trialDescriptionsRemaining = subscriptions?.trial_descriptions_remaining ?? 3;

      return {
        status: 'trial',
        tokens_balance: profile?.tokens_balance ?? 0,
        can_download: false,
        trial_photos_remaining: trialPhotosRemaining,
        trial_descriptions_remaining: trialDescriptionsRemaining
      };
    },
    staleTime: 30 * 1000, // 30 seconds
    retry: 2
  });
};

export const useSubscriptionPackages = () => {
  return useQuery({
    queryKey: ['subscription-packages'],
    queryFn: async (): Promise<SubscriptionPackage[]> => {
      // Use raw query since types aren't updated yet
      const { data, error } = await supabase
        .from('subscription_packages' as any)
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      return (data as unknown as SubscriptionPackage[]) || [];
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
};
