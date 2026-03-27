
-- Create payment provider settings table
CREATE TABLE public.payment_provider_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  active_provider text NOT NULL DEFAULT 'yookassa' CHECK (active_provider IN ('yookassa', 'cloudpayments')),
  cloudpayments_public_id text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Insert default row
INSERT INTO payment_provider_settings (active_provider) VALUES ('yookassa');

-- Enable RLS
ALTER TABLE public.payment_provider_settings ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read
CREATE POLICY "Authenticated can read provider settings"
  ON public.payment_provider_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can update
CREATE POLICY "Admins can manage provider settings"
  ON public.payment_provider_settings FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

-- Add payment_provider and external_payment_id to payments
ALTER TABLE public.payments
  ALTER COLUMN yookassa_payment_id DROP NOT NULL,
  ADD COLUMN payment_provider text DEFAULT 'yookassa',
  ADD COLUMN external_payment_id text;
