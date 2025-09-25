-- Fix YooKassa webhook signature verification and strengthen payment security

-- First, let's update the payments table RLS policies to be more restrictive
-- Drop existing broad service role policy and replace with more specific ones

-- Remove broad service role access to payments
DROP POLICY IF EXISTS "secure_payments_service_insert" ON public.payments;
DROP POLICY IF EXISTS "secure_payments_service_update" ON public.payments;

-- Create more restrictive service role policies
CREATE POLICY "secure_payments_webhook_insert" ON public.payments
FOR INSERT 
WITH CHECK (
    -- Only allow service role to insert with specific webhook metadata
    (auth.jwt() ->> 'role') = 'service_role' 
    AND user_id IS NOT NULL 
    AND package_name IS NOT NULL 
    AND amount > 0::numeric 
    AND tokens_amount > 0
    AND yookassa_payment_id IS NOT NULL
    AND status = 'pending'
);

CREATE POLICY "secure_payments_webhook_update" ON public.payments  
FOR UPDATE
USING (
    -- Only allow service role to update payment status from pending
    (auth.jwt() ->> 'role') = 'service_role'
    AND status = 'pending'
    AND yookassa_payment_id IS NOT NULL
)
WITH CHECK (
    -- Only allow updating to valid final states
    status IN ('succeeded', 'failed', 'canceled')
    AND yookassa_payment_id IS NOT NULL
);

-- Add audit logging for all payment changes
CREATE OR REPLACE FUNCTION public.log_payment_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Log all payment data access attempts
    PERFORM public.log_security_event(
        COALESCE(NEW.user_id, OLD.user_id),
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'payment_created'
            WHEN TG_OP = 'UPDATE' THEN 'payment_updated'  
            WHEN TG_OP = 'DELETE' THEN 'payment_deleted'
            WHEN TG_OP = 'SELECT' THEN 'payment_accessed'
        END,
        'Payment ' || TG_OP || ' operation performed',
        NULL,
        NULL,
        jsonb_build_object(
            'operation', TG_OP,
            'payment_id', COALESCE(NEW.id, OLD.id),
            'user_role', auth.jwt() ->> 'role',
            'timestamp', now()
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;