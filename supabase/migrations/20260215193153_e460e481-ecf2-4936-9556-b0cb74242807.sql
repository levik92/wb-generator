
-- Add is_trial flag to payment_packages
ALTER TABLE public.payment_packages ADD COLUMN is_trial boolean NOT NULL DEFAULT false;
