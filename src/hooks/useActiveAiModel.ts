import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ActiveModel = 'openai' | 'google';
export type ApiProvider = 'direct' | 'polza';

export const useActiveAiModel = () => {
  return useQuery({
    queryKey: ['active-ai-model'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_model_settings')
        .select('active_model, api_provider, video_api_provider')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching active model:', error);
        return { model: 'openai' as ActiveModel, provider: 'direct' as ApiProvider, videoProvider: 'direct' as ApiProvider };
      }

      return {
        model: (data?.active_model || 'openai') as ActiveModel,
        provider: ((data as any)?.api_provider || 'direct') as ApiProvider,
        videoProvider: ((data as any)?.video_api_provider || 'direct') as ApiProvider,
      };
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000,
  });
};

// For description generation (OpenAI без суффикса, Google с -banana, Polza с -polza)
export const getEdgeFunctionName = (baseFunction: string, model: ActiveModel, provider?: ApiProvider): string => {
  if (provider === 'polza') {
    return `${baseFunction}-polza`;
  }
  if (model === 'google') {
    return `${baseFunction}-banana`;
  }
  return baseFunction;
};

// For image generation (OpenAI с -v2, Google с -banana, Polza через orchestrator)
export const getImageEdgeFunctionName = (baseFunction: string, model: ActiveModel, provider?: ApiProvider): string => {
  if (provider === 'polza') {
    return `${baseFunction}-banana`; // Polza uses same orchestrator, routing happens inside
  }
  if (model === 'google') {
    return `${baseFunction}-banana`;
  }
  return `${baseFunction}-v2`;
};

// For video functions — uses separate videoProvider setting
export const getVideoEdgeFunctionName = (baseFunction: string, videoProvider?: ApiProvider): string => {
  if (videoProvider === 'polza') {
    return `${baseFunction}-polza`;
  }
  return baseFunction;
};

// For identify-product
export const getIdentifyFunctionName = (provider?: ApiProvider): string => {
  if (provider === 'polza') {
    return 'identify-product-polza';
  }
  return 'identify-product';
};
