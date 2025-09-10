-- Create promocodes table
CREATE TABLE public.promocodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('tokens', 'discount')),
  value INTEGER NOT NULL, -- tokens amount or discount percentage
  max_uses INTEGER DEFAULT NULL, -- NULL means unlimited
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create promocode_uses table to track who used which promocodes
CREATE TABLE public.promocode_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promocode_id UUID NOT NULL REFERENCES public.promocodes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(promocode_id, user_id) -- One user can use each promocode only once
);

-- Enable RLS
ALTER TABLE public.promocodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promocode_uses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for promocodes
CREATE POLICY "Admins can manage promocodes" 
ON public.promocodes 
FOR ALL 
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
  )
);

-- RLS Policies for promocode_uses
CREATE POLICY "Users can view their promocode uses" 
ON public.promocode_uses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert promocode uses" 
ON public.promocode_uses 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all promocode uses" 
ON public.promocode_uses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
  )
);

-- Add trigger to update updated_at column
CREATE TRIGGER update_promocodes_updated_at
  BEFORE UPDATE ON public.promocodes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();