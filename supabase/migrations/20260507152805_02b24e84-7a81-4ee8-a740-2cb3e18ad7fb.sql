-- Manual record of off-system bank transfer payment for ai3606849@gmail.com
-- Tokens (850) were already credited manually; this only records the payment for stats/history.

DO $$
DECLARE
  v_user_id uuid := 'dce168a0-7d54-4fd8-a030-b75e84896c6b';
  v_org_id uuid;
  v_invoice_no text := 'MANUAL-' || to_char(now(), 'YYYYMMDDHH24MISS');
BEGIN
  -- 1. Stub organization details
  INSERT INTO public.organization_details (user_id, name, inn)
  VALUES (v_user_id, 'Оплата по счёту (ai3606849@gmail.com)', '0000000000')
  RETURNING id INTO v_org_id;

  -- 2. Invoice payment record
  INSERT INTO public.invoice_payments (
    user_id, organization_id, package_id, package_name,
    amount, tokens_amount, invoice_number, invoice_date,
    payment_purpose, status, reviewed_at, reviewed_by, admin_notes
  ) VALUES (
    v_user_id,
    v_org_id,
    'f0f1dad8-08bc-4c1b-9af6-b399d49f3d29',
    'Профессиональный',
    9990,
    850,
    v_invoice_no,
    now(),
    'Ручное внесение оплаты по безналу (токены начислены администратором)',
    'paid',
    now(),
    NULL,
    'Внесено вручную администратором. Токены (850) уже начислены отдельной операцией, повторное начисление не требуется.'
  );
END $$;