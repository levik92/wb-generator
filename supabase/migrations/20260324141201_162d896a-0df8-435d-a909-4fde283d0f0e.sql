
-- UTM Sources table (admin-created UTM link configs)
CREATE TABLE public.utm_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  utm_source text NOT NULL,
  utm_medium text NOT NULL DEFAULT '',
  utm_campaign text NOT NULL DEFAULT '',
  base_url text NOT NULL DEFAULT 'https://wb-gen.lovable.app',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- UTM Visits table (tracks each visit with UTM params)
CREATE TABLE public.utm_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utm_source_id uuid REFERENCES public.utm_sources(id) ON DELETE CASCADE NOT NULL,
  visitor_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add utm_source_id to profiles for tracking registration source
ALTER TABLE public.profiles ADD COLUMN utm_source_id uuid REFERENCES public.utm_sources(id);

-- RLS for utm_sources
ALTER TABLE public.utm_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage utm sources"
  ON public.utm_sources FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Anyone can read utm sources"
  ON public.utm_sources FOR SELECT
  TO public
  USING (true);

-- RLS for utm_visits
ALTER TABLE public.utm_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read utm visits"
  ON public.utm_visits FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Anyone can insert utm visits"
  ON public.utm_visits FOR INSERT
  TO public
  WITH CHECK (true);
