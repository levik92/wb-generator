
-- Allow admins to view all token transactions
CREATE POLICY "Admins can view all token transactions"
ON public.token_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'::app_role
  )
);
