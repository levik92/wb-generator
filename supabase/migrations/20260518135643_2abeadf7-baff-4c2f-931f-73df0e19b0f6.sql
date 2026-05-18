ALTER TABLE public.finance_settings
ADD COLUMN IF NOT EXISTS payment_fee_rate NUMERIC NOT NULL DEFAULT 3;