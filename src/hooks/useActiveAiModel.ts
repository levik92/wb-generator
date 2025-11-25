import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ActiveModel = 'openai' | 'google';

export const useActiveAiModel = () => {
  return useQuery({
    queryKey: ['active-ai-model'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_model_settings')
        .select('active_model')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching active model:', error);
        // Default to openai if error
        return 'openai' as ActiveModel;
      }

      return (data?.active_model || 'openai') as ActiveModel;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
  });
};

// For description generation (OpenAI без суффикса, Google с -banana)
export const getEdgeFunctionName = (baseFunction: string, model: ActiveModel): string => {
  if (model === 'google') {
    return `${baseFunction}-banana`;
  }
  return baseFunction;
};

// For image generation (OpenAI с -v2, Google с -banana)
export const getImageEdgeFunctionName = (baseFunction: string, model: ActiveModel): string => {
  if (model === 'google') {
    return `${baseFunction}-banana`;
  }
  return `${baseFunction}-v2`;
};