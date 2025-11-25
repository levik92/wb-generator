-- Create table for AI model settings
CREATE TABLE IF NOT EXISTS public.ai_model_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  active_model TEXT NOT NULL CHECK (active_model IN ('openai', 'google')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default setting (OpenAI active by default)
INSERT INTO public.ai_model_settings (active_model)
VALUES ('openai')
ON CONFLICT DO NOTHING;

-- Add model_type column to ai_prompts table
ALTER TABLE public.ai_prompts 
ADD COLUMN IF NOT EXISTS model_type TEXT DEFAULT 'openai' CHECK (model_type IN ('openai', 'google'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_prompts_model_type ON public.ai_prompts(model_type);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_type_model ON public.ai_prompts(prompt_type, model_type);

-- Enable RLS on ai_model_settings
ALTER TABLE public.ai_model_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage model settings
CREATE POLICY "Admins can manage AI model settings"
ON public.ai_model_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Policy: Everyone can read active model
CREATE POLICY "Everyone can read active AI model"
ON public.ai_model_settings
FOR SELECT
USING (true);

-- Function to get active model
CREATE OR REPLACE FUNCTION public.get_active_ai_model()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT active_model FROM public.ai_model_settings ORDER BY updated_at DESC LIMIT 1;
$$;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_ai_model_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_model_settings_updated_at
BEFORE UPDATE ON public.ai_model_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_ai_model_settings_updated_at();