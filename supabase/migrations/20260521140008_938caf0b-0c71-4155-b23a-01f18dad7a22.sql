ALTER TABLE public.marketing_channels ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
WITH ordered AS (
  SELECT id, (ROW_NUMBER() OVER (ORDER BY created_at)) * 10 AS rn
  FROM public.marketing_channels
)
UPDATE public.marketing_channels mc SET sort_order = ordered.rn
FROM ordered WHERE mc.id = ordered.id AND mc.sort_order = 0;
CREATE INDEX IF NOT EXISTS marketing_channels_sort_order_idx ON public.marketing_channels(sort_order);