
-- Add display_order to payment_packages
ALTER TABLE public.payment_packages 
ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

-- Initialize display_order from current price ordering
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY price ASC) AS rn
  FROM public.payment_packages
)
UPDATE public.payment_packages p
SET display_order = o.rn
FROM ordered o
WHERE p.id = o.id;

-- Add display_order to generation_pricing
ALTER TABLE public.generation_pricing
ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY price_type ASC) AS rn
  FROM public.generation_pricing
)
UPDATE public.generation_pricing p
SET display_order = o.rn
FROM ordered o
WHERE p.id = o.id;
