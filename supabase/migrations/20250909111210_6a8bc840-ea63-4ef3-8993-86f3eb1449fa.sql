-- Fix payments table RLS policies to prevent unauthorized access to financial data

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "System can insert payments" ON public.payments;
DROP POLICY IF EXISTS "System can update payments" ON public.payments;

-- Create secure policies with explicit anonymous user prevention
CREATE POLICY "authenticated_users_own_payments_select" 
ON public.payments 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "admins_all_payments_select" 
ON public.payments 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "service_role_payments_insert" 
ON public.payments 
FOR INSERT 
TO service_role
WITH CHECK (true);

CREATE POLICY "service_role_payments_update" 
ON public.payments 
FOR UPDATE 
TO service_role
USING (true);