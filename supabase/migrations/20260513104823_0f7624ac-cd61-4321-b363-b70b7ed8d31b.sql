
ALTER TABLE public.invoice_payments ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.invoice_payments ALTER COLUMN package_id DROP NOT NULL;
ALTER TABLE public.invoice_payments ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.invoice_payments ADD COLUMN IF NOT EXISTS is_manual boolean NOT NULL DEFAULT false;
ALTER TABLE public.invoice_payments ADD COLUMN IF NOT EXISTS notes text;

CREATE OR REPLACE FUNCTION public.admin_create_manual_invoice(
  p_email text,
  p_amount numeric,
  p_tokens integer,
  p_invoice_number text,
  p_invoice_date timestamptz,
  p_package_name text,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_invoice_id uuid;
  v_admin uuid := auth.uid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_admin AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  IF p_amount <= 0 OR p_tokens <= 0 THEN
    RAISE EXCEPTION 'Amount and tokens must be positive';
  END IF;

  SELECT id INTO v_user_id FROM profiles WHERE lower(email) = lower(trim(p_email)) LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', p_email;
  END IF;

  INSERT INTO invoice_payments (
    user_id, organization_id, package_id, package_name,
    amount, tokens_amount, status, invoice_number, invoice_date,
    payment_purpose, is_manual, created_by, notes
  ) VALUES (
    v_user_id, NULL, NULL, COALESCE(NULLIF(trim(p_package_name), ''), 'Ручное пополнение'),
    p_amount, p_tokens, 'awaiting_confirmation', p_invoice_number, COALESCE(p_invoice_date, now()),
    COALESCE(NULLIF(trim(p_package_name), ''), 'Ручное пополнение'), true, v_admin, p_notes
  )
  RETURNING id INTO v_invoice_id;

  RETURN v_invoice_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_manual_invoice(text, numeric, integer, text, timestamptz, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.process_invoice_payment(p_invoice_id uuid, p_admin_id uuid, p_action text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice invoice_payments%ROWTYPE;
  v_desc text;
BEGIN
  SELECT * INTO v_invoice FROM invoice_payments WHERE id = p_invoice_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  IF p_action = 'approve' THEN
    UPDATE invoice_payments SET status = 'paid', reviewed_by = p_admin_id, reviewed_at = now(), updated_at = now() WHERE id = p_invoice_id;

    PERFORM set_config('app.bypass_token_protection', 'true', true);
    UPDATE profiles SET tokens_balance = tokens_balance + v_invoice.tokens_amount, updated_at = now() WHERE id = v_invoice.user_id;

    v_desc := CASE WHEN v_invoice.is_manual
      THEN 'Ручное начисление администратором по счёту #' || v_invoice.invoice_number || ' — ' || v_invoice.package_name
      ELSE 'Оплата по счёту #' || v_invoice.invoice_number || ' — ' || v_invoice.package_name
    END;

    INSERT INTO token_transactions (user_id, amount, transaction_type, description)
    VALUES (v_invoice.user_id, v_invoice.tokens_amount, 'invoice_payment', v_desc);

    -- Mirror into payments for analytics/admin payments tab (idempotent)
    INSERT INTO payments (user_id, package_name, amount, tokens_amount, status, payment_provider, external_payment_id, confirmed_at, metadata)
    SELECT v_invoice.user_id, v_invoice.package_name, v_invoice.amount, v_invoice.tokens_amount,
           'succeeded',
           CASE WHEN v_invoice.is_manual THEN 'manual_invoice' ELSE 'invoice' END,
           'invoice_' || v_invoice.id::text,
           now(),
           jsonb_build_object('invoice_id', v_invoice.id, 'invoice_number', v_invoice.invoice_number, 'is_manual', v_invoice.is_manual)
    WHERE NOT EXISTS (SELECT 1 FROM payments WHERE external_payment_id = 'invoice_' || v_invoice.id::text);

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
$function$;
