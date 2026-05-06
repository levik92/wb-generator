UPDATE public.payments
SET status = 'succeeded',
    confirmed_at = '2026-05-06 11:49:16+00',
    updated_at = now()
WHERE id = 'd187d89e-e62e-4232-bd51-96a56b1ebc55'
  AND status = 'failed';