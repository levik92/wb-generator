-- Create table for generation pricing configuration
CREATE TABLE IF NOT EXISTS public.generation_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  price_type TEXT NOT NULL UNIQUE,
  tokens_cost INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generation_pricing ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read pricing
CREATE POLICY "Anyone can read generation pricing"
ON public.generation_pricing
FOR SELECT
USING (true);

-- Policy: Only admins can manage pricing
CREATE POLICY "Admins can manage generation pricing"
ON public.generation_pricing
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Insert default pricing values
INSERT INTO public.generation_pricing (price_type, tokens_cost, description) VALUES
  ('photo_generation', 1, 'Стоимость генерации фото'),
  ('photo_regeneration', 1, 'Стоимость перегенерации фото'),
  ('description_generation', 2, 'Стоимость генерации описания')
ON CONFLICT (price_type) DO NOTHING;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_generation_pricing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_generation_pricing_updated_at
BEFORE UPDATE ON public.generation_pricing
FOR EACH ROW
EXECUTE FUNCTION public.update_generation_pricing_updated_at();