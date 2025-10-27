-- Create table for partner bank details
CREATE TABLE IF NOT EXISTS public.partner_bank_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partner_profiles(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  card_number TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(partner_id)
);

-- Enable RLS
ALTER TABLE public.partner_bank_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies for partner_bank_details
CREATE POLICY "Partners can view own bank details"
ON public.partner_bank_details FOR SELECT
USING (partner_id IN (
  SELECT id FROM public.partner_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Partners can insert own bank details"
ON public.partner_bank_details FOR INSERT
WITH CHECK (partner_id IN (
  SELECT id FROM public.partner_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Partners can update own bank details"
ON public.partner_bank_details FOR UPDATE
USING (partner_id IN (
  SELECT id FROM public.partner_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Admins can view all bank details"
ON public.partner_bank_details FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
));

-- Update partner_withdrawals table to track status properly
ALTER TABLE public.partner_withdrawals 
  DROP COLUMN IF EXISTS status CASCADE,
  ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected'));

-- Add bank details reference
ALTER TABLE public.partner_withdrawals
  ADD COLUMN IF NOT EXISTS bank_details_snapshot JSONB;

-- Update RLS for partner_withdrawals to allow service role
CREATE POLICY "Service can update withdrawals"
ON public.partner_withdrawals FOR UPDATE
USING (auth.role() = 'service_role');

-- Trigger to update partner_bank_details timestamp
CREATE OR REPLACE FUNCTION update_partner_bank_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_partner_bank_details_timestamp
BEFORE UPDATE ON public.partner_bank_details
FOR EACH ROW
EXECUTE FUNCTION update_partner_bank_details_updated_at();