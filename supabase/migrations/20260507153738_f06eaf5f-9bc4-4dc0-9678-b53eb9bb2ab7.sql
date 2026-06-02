INSERT INTO public.payments (
  user_id, amount, package_name, tokens_amount, status,
  payment_provider, external_payment_id, confirmed_at, created_at, updated_at,
  metadata
) VALUES (
  'dce168a0-7d54-4fd8-a030-b75e84896c6b',
  9990,
  'Профессиональный',
  850,
  'succeeded',
  'invoice',
  'MANUAL-INVOICE-' || extract(epoch from now())::bigint,
  now(), now(), now(),
  jsonb_build_object(
    'manual', true,
    'source', 'bank_transfer',
    'admin_note', 'Ручное внесение оплаты по безналу. Токены (850) уже начислены отдельной операцией. Связано с invoice_payments.'
  )
);