UPDATE public.payments
SET status = 'expired', updated_at = now()
WHERE user_id = 'b3927f56-7b19-4242-b4b4-3a2e5ddd2d4d'
  AND payment_provider = 'cloudpayments'
  AND status = 'pending'
  AND created_at < now() - interval '5 minutes';