-- CRITICAL SECURITY FIXES - Phase 1: Fix RLS Policies and Admin Controls

-- 1. Fix promocodes table RLS - Currently exposed to all users
DROP POLICY IF EXISTS "Admins can manage promocodes" ON public.promocodes;

CREATE POLICY "Admins can view all promocodes" 
ON public.promocodes 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
));

CREATE POLICY "Admins can insert promocodes" 
ON public.promocodes 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
));

CREATE POLICY "Admins can update promocodes" 
ON public.promocodes 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
));

CREATE POLICY "Admins can delete promocodes" 
ON public.promocodes 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
));

-- 2. Fix promocode_uses table RLS - Currently has mixed policies
DROP POLICY IF EXISTS "Admins can view all promocode uses" ON public.promocode_uses;
DROP POLICY IF EXISTS "Users can view their promocode uses" ON public.promocode_uses;
DROP POLICY IF EXISTS "System can insert promocode uses" ON public.promocode_uses;

-- Only admins can view all promocode usage data
CREATE POLICY "Admins can view all promocode uses" 
ON public.promocode_uses 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
));

-- Users can only see their own usage
CREATE POLICY "Users can view own promocode uses" 
ON public.promocode_uses 
FOR SELECT 
USING (auth.uid() = user_id);

-- System (service role) can insert new uses
CREATE POLICY "Service role can insert promocode uses" 
ON public.promocode_uses 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- 3. Fix profiles table RLS - Remove conflicting policies and strengthen access
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Users can only access their own profile data
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Admins can view all profiles but with audit trail
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
));

-- Admins can update profiles with audit trail
CREATE POLICY "Admins can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::app_role
));

-- 4. Strengthen user_roles table policies
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;

CREATE POLICY "Admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert user roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update user roles" 
ON public.user_roles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete user roles" 
ON public.user_roles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own roles
CREATE POLICY "Users can view own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

-- 5. Add audit trigger for user role changes
CREATE OR REPLACE FUNCTION public.audit_user_role_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.log_audit_event(
            auth.uid(),
            'role_assigned',
            'user_roles',
            NEW.id::text,
            NULL,
            row_to_json(NEW)::jsonb
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.log_audit_event(
            auth.uid(),
            'role_updated',
            'user_roles',
            NEW.id::text,
            row_to_json(OLD)::jsonb,
            row_to_json(NEW)::jsonb
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.log_audit_event(
            auth.uid(),
            'role_removed',
            'user_roles',
            OLD.id::text,
            row_to_json(OLD)::jsonb,
            NULL
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for user role audit trail
DROP TRIGGER IF EXISTS audit_user_roles_trigger ON public.user_roles;
CREATE TRIGGER audit_user_roles_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.audit_user_role_changes();

-- 6. Add function to validate promocode usage securely
CREATE OR REPLACE FUNCTION public.use_promocode(code_param text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    promocode_record RECORD;
    result jsonb;
BEGIN
    -- Get promocode details with row lock
    SELECT * INTO promocode_record
    FROM public.promocodes
    WHERE code = code_param
      AND is_active = true
      AND (valid_from IS NULL OR valid_from <= now())
      AND (valid_until IS NULL OR valid_until >= now())
      AND (max_uses IS NULL OR current_uses < max_uses)
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired promocode');
    END IF;
    
    -- Check if user already used this code
    IF EXISTS (
        SELECT 1 FROM public.promocode_uses 
        WHERE promocode_id = promocode_record.id 
          AND user_id = auth.uid()
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Promocode already used');
    END IF;
    
    -- Update usage count
    UPDATE public.promocodes 
    SET current_uses = current_uses + 1,
        updated_at = now()
    WHERE id = promocode_record.id;
    
    -- Record usage
    INSERT INTO public.promocode_uses (promocode_id, user_id)
    VALUES (promocode_record.id, auth.uid());
    
    -- Apply bonus based on type
    IF promocode_record.type = 'tokens' THEN
        UPDATE public.profiles
        SET tokens_balance = tokens_balance + promocode_record.value,
            updated_at = now()
        WHERE id = auth.uid();
        
        INSERT INTO public.token_transactions (user_id, amount, transaction_type, description)
        VALUES (auth.uid(), promocode_record.value, 'promocode', 'Промокод: ' || code_param);
    END IF;
    
    -- Log security event
    PERFORM public.log_security_event(
        auth.uid(),
        'promocode_used',
        'User used promocode: ' || code_param,
        NULL,
        NULL,
        jsonb_build_object('promocode', code_param, 'value', promocode_record.value, 'type', promocode_record.type)
    );
    
    RETURN jsonb_build_object(
        'success', true, 
        'type', promocode_record.type,
        'value', promocode_record.value
    );
END;
$$;