-- Create dashboard banners table
CREATE TABLE public.dashboard_banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL CHECK (char_length(title) <= 100),
  description TEXT NOT NULL CHECK (char_length(description) <= 200),
  gradient_start TEXT NOT NULL DEFAULT '#ec4899',
  gradient_end TEXT NOT NULL DEFAULT '#f43f5e',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dashboard_banners ENABLE ROW LEVEL SECURITY;

-- Everyone can read active banners
CREATE POLICY "Everyone can view active banners" 
ON public.dashboard_banners 
FOR SELECT 
USING (is_active = true);

-- Admins can manage all banners
CREATE POLICY "Admins can manage all banners" 
ON public.dashboard_banners 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'::app_role
));

-- Table for tracking dismissed banners per user
CREATE TABLE public.user_dismissed_banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  banner_id UUID NOT NULL REFERENCES public.dashboard_banners(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, banner_id)
);

-- Enable RLS
ALTER TABLE public.user_dismissed_banners ENABLE ROW LEVEL SECURITY;

-- Users can view their own dismissed banners
CREATE POLICY "Users can view own dismissed banners" 
ON public.user_dismissed_banners 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own dismissed banners
CREATE POLICY "Users can dismiss banners" 
ON public.user_dismissed_banners 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_dashboard_banners_updated_at
BEFORE UPDATE ON public.dashboard_banners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();