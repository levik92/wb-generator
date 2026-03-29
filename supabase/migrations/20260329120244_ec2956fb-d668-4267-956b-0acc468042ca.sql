
-- 1. Update check constraint to include 'expired' status
ALTER TABLE public.payments DROP CONSTRAINT check_valid_status;
ALTER TABLE public.payments ADD CONSTRAINT check_valid_status 
  CHECK (status = ANY (ARRAY['pending'::text, 'succeeded'::text, 'failed'::text, 'canceled'::text, 'expired'::text]));

-- 2. Update RLS policy to allow 'expired' status  
DROP POLICY IF EXISTS "secure_payments_webhook_update" ON public.payments;

CREATE POLICY "secure_payments_webhook_update"
ON public.payments
FOR UPDATE
USING (
  ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
  AND (status = 'pending'::text)
)
WITH CHECK (
  (status = ANY (ARRAY['succeeded'::text, 'failed'::text, 'canceled'::text, 'expired'::text]))
);

-- 3. Expire all existing stale pending payments (older than 1 hour)
UPDATE public.payments
SET status = 'expired', updated_at = now()
WHERE status = 'pending' AND created_at < now() - interval '1 hour';
