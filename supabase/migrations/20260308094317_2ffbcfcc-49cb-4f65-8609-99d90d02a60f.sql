
-- Create system_status table (single-row config table)
CREATE TABLE public.system_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'none',
  message text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed with initial row
INSERT INTO public.system_status (status, message) VALUES ('none', '');

-- Enable RLS
ALTER TABLE public.system_status ENABLE ROW LEVEL SECURITY;

-- Admins can manage
CREATE POLICY "Admins can manage system status"
  ON public.system_status FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

-- All authenticated users can read
CREATE POLICY "Authenticated users can read system status"
  ON public.system_status FOR SELECT
  TO authenticated
  USING (true);
