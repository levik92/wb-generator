CREATE TABLE public.support_ai_defaults (
  channel TEXT PRIMARY KEY,
  ai_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.support_ai_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage support_ai_defaults"
  ON public.support_ai_defaults
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access on support_ai_defaults"
  ON public.support_ai_defaults
  FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO public.support_ai_defaults (channel, ai_enabled) VALUES
  ('widget', true),
  ('dashboard', false)
ON CONFLICT DO NOTHING;