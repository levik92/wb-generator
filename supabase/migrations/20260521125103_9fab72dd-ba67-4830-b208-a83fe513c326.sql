
-- Junction: marketing_channels <-> utm_sources (many-to-many)
CREATE TABLE IF NOT EXISTS public.marketing_channel_utm_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.marketing_channels(id) ON DELETE CASCADE,
  utm_source_id uuid NOT NULL REFERENCES public.utm_sources(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_id, utm_source_id)
);

CREATE INDEX IF NOT EXISTS idx_mcus_channel ON public.marketing_channel_utm_sources(channel_id);
CREATE INDEX IF NOT EXISTS idx_mcus_utm ON public.marketing_channel_utm_sources(utm_source_id);

ALTER TABLE public.marketing_channel_utm_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage marketing_channel_utm_sources"
ON public.marketing_channel_utm_sources
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
