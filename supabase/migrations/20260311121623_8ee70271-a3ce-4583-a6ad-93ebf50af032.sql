
-- Create service_friends table
CREATE TABLE public.service_friends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  short_description TEXT NOT NULL,
  detailed_description TEXT NOT NULL,
  exclusive_conditions TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  service_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_friends ENABLE ROW LEVEL SECURITY;

-- Admins can manage all friends
CREATE POLICY "Admins can manage service friends"
ON public.service_friends
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role = 'admin'::app_role
))
WITH CHECK (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role = 'admin'::app_role
));

-- Anyone can read active friends
CREATE POLICY "Anyone can read active service friends"
ON public.service_friends
FOR SELECT
TO public
USING (is_active = true);
