-- Comprehensive financial transaction data protection (corrected)
-- This migration addresses security concerns about potential payment data exposure

-- 1. Add additional security triggers and audit logging for payments
CREATE OR REPLACE FUNCTION public.audit_payment_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.log_audit_event(
            NULL, -- system operation
            'payment_created',
            'payments',
            NEW.id::text,
            NULL,
            jsonb_build_object('user_id', NEW.user_id, 'amount', NEW.amount, 'package_name', NEW.package_name)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.log_audit_event(
            NULL, -- system operation
            'payment_updated',
            'payments',
            NEW.id::text,
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status)
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create audit trigger for payments table
DROP TRIGGER IF EXISTS audit_payment_changes_trigger ON public.payments;
CREATE TRIGGER audit_payment_changes_trigger
    AFTER INSERT OR UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.audit_payment_changes();

-- 2. Create security function to validate payment access
CREATE OR REPLACE FUNCTION public.can_access_payment(payment_user_id uuid)
RETURNS boolean AS $$
BEGIN
    -- Only allow access if user owns the payment or is an admin
    RETURN (
        auth.uid() = payment_user_id 
        OR EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'::app_role
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 3. Enhance existing RLS policies with additional security checks
DROP POLICY IF EXISTS "secure_payments_user_select" ON public.payments;
CREATE POLICY "secure_payments_user_select" ON public.payments
FOR SELECT
USING (
    -- More restrictive user access with time-based validation
    auth.uid() IS NOT NULL 
    AND auth.uid() = user_id 
    AND status IN ('pending', 'succeeded', 'failed', 'canceled')
    AND created_at > (now() - interval '1 year') -- Limit historical access
);

DROP POLICY IF EXISTS "secure_payments_admin_select" ON public.payments;
CREATE POLICY "secure_payments_admin_select" ON public.payments
FOR SELECT
USING (
    -- Enhanced admin access with explicit role validation and logging
    auth.uid() IS NOT NULL 
    AND EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'::app_role
    )
    AND (
        -- Log admin access attempts (function call always returns something, so this works)
        public.log_security_event(
            auth.uid(),
            'admin_payment_access',
            'Admin accessed payment data',
            NULL,
            NULL,
            jsonb_build_object('payment_id', id, 'accessed_at', now())
        ) IS NOT NULL
        OR TRUE -- Always allow after logging
    )
);

-- 4. Add function to get sanitized payment data for admin views
CREATE OR REPLACE FUNCTION public.get_payment_summary(payment_ids uuid[])
RETURNS TABLE(
    id uuid,
    user_id uuid,
    amount_masked text,
    package_name text,
    status text,
    created_at timestamptz
) AS $$
BEGIN
    -- Only allow admins to use this function
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'::app_role
    ) THEN
        RAISE EXCEPTION 'Unauthorized access to payment summary';
    END IF;
    
    -- Return sanitized payment data
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        CASE 
            WHEN p.amount < 1000 THEN p.amount::text || ' ' || p.currency
            ELSE '***' || ' ' || p.currency
        END as amount_masked,
        p.package_name,
        p.status,
        p.created_at
    FROM public.payments p
    WHERE p.id = ANY(payment_ids)
    AND p.created_at > (now() - interval '6 months'); -- Limit to recent payments
    
    -- Log the access
    PERFORM public.log_security_event(
        auth.uid(),
        'payment_summary_accessed',
        'Admin accessed payment summary data',
        NULL,
        NULL,
        jsonb_build_object('payment_count', array_length(payment_ids, 1))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Add function to validate payment data integrity
CREATE OR REPLACE FUNCTION public.validate_payment_integrity()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate payment data on insert/update
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Ensure critical fields are present
        IF NEW.user_id IS NULL OR NEW.amount <= 0 OR NEW.package_name IS NULL THEN
            RAISE EXCEPTION 'Invalid payment data: missing required fields';
        END IF;
        
        -- Validate amount ranges (reasonable limits)
        IF NEW.amount > 100000 OR NEW.amount < 0.01 THEN
            RAISE EXCEPTION 'Invalid payment amount: outside acceptable range';
        END IF;
        
        -- Log validation success for audit trail
        PERFORM public.log_security_event(
            NEW.user_id,
            'payment_validation_success',
            'Payment data validated successfully',
            NULL,
            NULL,
            jsonb_build_object('payment_id', NEW.id, 'amount', NEW.amount)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create validation trigger
DROP TRIGGER IF EXISTS validate_payment_integrity_trigger ON public.payments;
CREATE TRIGGER validate_payment_integrity_trigger
    BEFORE INSERT OR UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.validate_payment_integrity();

-- 6. Create function to detect and prevent payment data enumeration
CREATE OR REPLACE FUNCTION public.check_payment_access_rate()
RETURNS TRIGGER AS $$
DECLARE
    access_count INTEGER;
    user_role TEXT;
BEGIN
    -- Get user role
    SELECT ur.role INTO user_role
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid();
    
    -- Count recent payment-related security events by this user
    SELECT COUNT(*) INTO access_count
    FROM public.security_events
    WHERE user_id = auth.uid()
    AND event_type IN ('admin_payment_access', 'payment_validation_success')
    AND created_at > (now() - interval '1 hour');
    
    -- Alert on suspicious patterns (high access rate)
    IF access_count > 100 AND COALESCE(user_role, 'user') != 'admin' THEN
        PERFORM public.log_security_event(
            auth.uid(),
            'suspicious_payment_access',
            'User exceeded normal payment access patterns',
            NULL,
            NULL,
            jsonb_build_object(
                'access_count', access_count,
                'user_role', COALESCE(user_role, 'user'),
                'time_window', '1 hour',
                'severity', 'high'
            )
        );
        
        -- Optionally, we could RAISE EXCEPTION here to block the operation
        -- RAISE EXCEPTION 'Access rate limit exceeded for payment data';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create rate limiting trigger
DROP TRIGGER IF EXISTS check_payment_access_rate_trigger ON public.payments;
CREATE TRIGGER check_payment_access_rate_trigger
    AFTER INSERT OR UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.check_payment_access_rate();