import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GenerationPrice {
  id: string;
  price_type: string;
  tokens_cost: number;
  description: string;
}

export type PriceType = 'photo_generation' | 'photo_regeneration' | 'description_generation' | 'photo_edit' | 'video_generation' | 'video_regeneration';

export const useGenerationPricing = () => {
  return useQuery({
    queryKey: ['generation-pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('generation_pricing')
        .select('*')
        .order('price_type');

      if (error) throw error;
      return data as GenerationPrice[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

export const useGenerationPrice = (priceType: PriceType) => {
  const { data: prices, isLoading, error } = useGenerationPricing();
  
  const price = prices?.find(p => p.price_type === priceType);
  
  return {
    price: price?.tokens_cost ?? 0,
    isLoading,
    error,
  };
};
