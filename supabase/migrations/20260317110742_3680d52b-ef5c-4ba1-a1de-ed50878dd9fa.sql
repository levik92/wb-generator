-- Fix: restrict INSERT on bonus_submissions to only allow pending status with no tokens
DROP POLICY "Users can create their own submissions" ON public.bonus_submissions;

CREATE POLICY "Users can create their own submissions"
ON public.bonus_submissions
FOR INSERT
TO public
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND tokens_awarded IS NULL
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
  AND admin_notes IS NULL
);

-- Clean up the fraudulent record
UPDATE public.bonus_submissions
SET status = 'rejected',
    tokens_awarded = NULL,
    admin_notes = 'Auto-rejected: fraudulent submission with manipulated status/tokens',
    reviewed_at = now()
WHERE user_id IN (
  SELECT id FROM profiles WHERE email = 'rlqiwnns@guerrillamailblock.com'
)
AND status = 'approved'
AND tokens_awarded = 99999;