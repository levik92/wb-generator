
-- Add invoice_enabled column to payment_packages
ALTER TABLE public.payment_packages ADD COLUMN IF NOT EXISTS invoice_enabled boolean NOT NULL DEFAULT false;

-- Organization details for legal entities
CREATE TABLE public.organization_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  inn text NOT NULL,
  name text NOT NULL,
  kpp text,
  ogrn text,
  legal_address text,
  actual_address text,
  bank_name text,
  bik text,
  checking_account text,
  correspondent_account text,
  director_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own org details" ON public.organization_details
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all org details" ON public.organization_details
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

-- Invoice payments table
CREATE TABLE public.invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organization_details(id) NOT NULL,
  package_id uuid REFERENCES public.payment_packages(id) NOT NULL,
  package_name text NOT NULL,
  amount numeric NOT NULL,
  tokens_amount integer NOT NULL,
  status text NOT NULL DEFAULT 'invoice_issued',
  invoice_number text NOT NULL,
  invoice_date timestamptz NOT NULL DEFAULT now(),
  payment_purpose text NOT NULL,
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoice_status_check CHECK (status IN ('invoice_issued', 'awaiting_confirmation', 'paid', 'rejected'))
);

ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices" ON public.invoice_payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own invoices" ON public.invoice_payments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'invoice_issued');

CREATE POLICY "Users can update own invoices to awaiting" ON public.invoice_payments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id AND status = 'invoice_issued')
  WITH CHECK (status = 'awaiting_confirmation');

CREATE POLICY "Admins can view all invoices" ON public.invoice_payments
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can update all invoices" ON public.invoice_payments
  FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Service role full access invoices" ON public.invoice_payments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Function to process invoice payment (admin confirms)
CREATE OR REPLACE FUNCTION public.process_invoice_payment(p_invoice_id uuid, p_admin_id uuid, p_action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice invoice_payments%ROWTYPE;
BEGIN
  SELECT * INTO v_invoice FROM invoice_payments WHERE id = p_invoice_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  IF p_action = 'approve' THEN
    -- Update invoice status
    UPDATE invoice_payments SET status = 'paid', reviewed_by = p_admin_id, reviewed_at = now(), updated_at = now() WHERE id = p_invoice_id;
    
    -- Credit tokens using bypass flag
    PERFORM set_config('app.bypass_token_protection', 'true', true);
    UPDATE profiles SET tokens_balance = tokens_balance + v_invoice.tokens_amount, updated_at = now() WHERE id = v_invoice.user_id;
    
    -- Log transaction
    INSERT INTO token_transactions (user_id, amount, transaction_type, description)
    VALUES (v_invoice.user_id, v_invoice.tokens_amount, 'invoice_payment', 'Оплата по счёту #' || v_invoice.invoice_number || ' — ' || v_invoice.package_name);
    
    -- Create notification
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (v_invoice.user_id, 'Оплата подтверждена', 'Счёт #' || v_invoice.invoice_number || ' оплачен. Начислено ' || v_invoice.tokens_amount || ' токенов.', 'payment_confirmed');
    
  ELSIF p_action = 'reject' THEN
    UPDATE invoice_payments SET status = 'rejected', reviewed_by = p_admin_id, reviewed_at = now(), updated_at = now() WHERE id = p_invoice_id;
    
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (v_invoice.user_id, 'Счёт отклонён', 'Счёт #' || v_invoice.invoice_number || ' был отклонён администратором.', 'payment_failed');
  ELSE
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;
END;
$$;

-- Sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1001;
