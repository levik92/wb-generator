-- Implement proper API key encryption and strengthen payment data security

-- First, enable the pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a more secure API key storage function with proper encryption
CREATE OR REPLACE FUNCTION public.store_user_api_key_secure(provider_name text, api_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    key_hash_value text;
    encrypted_key_value text;
    encryption_key text;
BEGIN
    -- Validate input
    IF provider_name IS NULL OR trim(provider_name) = '' THEN
        RAISE EXCEPTION 'Provider name cannot be empty';
    END IF;
    
    IF api_key IS NULL OR trim(api_key) = '' THEN
        RAISE EXCEPTION 'API key cannot be empty';
    END IF;
    
    -- Validate user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Generate a strong encryption key using user ID and a secret
    encryption_key := encode(hmac(auth.uid()::text, 'api_key_encryption_salt_2024', 'sha256'), 'hex');
    
    -- Generate hash for quick lookups (first 8 chars + hash of full key)
    key_hash_value := substring(api_key from 1 for 8) || 
                     encode(digest(api_key, 'sha256'), 'hex');
    
    -- Encrypt the API key using pgcrypto
    encrypted_key_value := encode(encrypt(api_key::bytea, encryption_key::bytea, 'aes'), 'base64');
    
    -- Insert or update the API key with proper conflict handling
    INSERT INTO public.user_api_keys (user_id, provider, encrypted_key, key_hash)
    VALUES (auth.uid(), provider_name, encrypted_key_value, key_hash_value)
    ON CONFLICT (user_id, provider)
    DO UPDATE SET 
        encrypted_key = EXCLUDED.encrypted_key,
        key_hash = EXCLUDED.key_hash,
        updated_at = now(),
        is_active = true;
    
    -- Log security event
    PERFORM public.log_security_event(
        auth.uid(),
        'api_key_stored',
        'User stored encrypted API key for provider: ' || provider_name,
        NULL,
        NULL,
        jsonb_build_object('provider', provider_name, 'encrypted', true)
    );
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        -- Log security event for failed attempts
        PERFORM public.log_security_event(
            auth.uid(),
            'api_key_storage_failed',
            'Failed to store API key: ' || SQLERRM,
            NULL,
            NULL,
            jsonb_build_object('provider', provider_name, 'error', SQLERRM)
        );
        RAISE;
END;
$$;

-- Create a secure function to retrieve decrypted API keys (for edge functions only)
CREATE OR REPLACE FUNCTION public.get_user_api_key_decrypted(user_id_param uuid, provider_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    encrypted_key_value text;
    encryption_key text;
    decrypted_key text;
BEGIN
    -- This function should only be called by service role or the user themselves
    IF auth.role() != 'service_role' AND auth.uid() != user_id_param THEN
        RAISE EXCEPTION 'Unauthorized access to API key';
    END IF;
    
    -- Get the encrypted key
    SELECT encrypted_key INTO encrypted_key_value
    FROM public.user_api_keys
    WHERE user_id = user_id_param 
      AND provider = provider_name 
      AND is_active = true;
    
    IF encrypted_key_value IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Generate the same encryption key
    encryption_key := encode(hmac(user_id_param::text, 'api_key_encryption_salt_2024', 'sha256'), 'hex');
    
    -- Decrypt the key
    decrypted_key := convert_from(decrypt(decode(encrypted_key_value, 'base64'), encryption_key::bytea, 'aes'), 'UTF8');
    
    -- Update last_used_at timestamp
    UPDATE public.user_api_keys
    SET last_used_at = now()
    WHERE user_id = user_id_param AND provider = provider_name;
    
    -- Log access (without exposing the key)
    PERFORM public.log_security_event(
        user_id_param,
        'api_key_accessed',
        'API key accessed for provider: ' || provider_name,
        NULL,
        NULL,
        jsonb_build_object('provider', provider_name, 'decrypted', true)
    );
    
    RETURN decrypted_key;
EXCEPTION
    WHEN OTHERS THEN
        -- Log security event for failed decryption attempts
        PERFORM public.log_security_event(
            user_id_param,
            'api_key_decryption_failed',
            'Failed to decrypt API key: ' || SQLERRM,
            NULL,
            NULL,
            jsonb_build_object('provider', provider_name, 'error', SQLERRM)
        );
        RETURN NULL;
END;
$$;

-- Strengthen user_api_keys RLS policies with additional security checks
DROP POLICY IF EXISTS "Users can delete their own API keys" ON public.user_api_keys;
DROP POLICY IF EXISTS "Users can insert their own API keys" ON public.user_api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON public.user_api_keys;
DROP POLICY IF EXISTS "Users can view their own API keys" ON public.user_api_keys;

-- Create ultra-secure policies for API keys
CREATE POLICY "secure_api_keys_select" 
ON public.user_api_keys 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id AND
  is_active = true
);

CREATE POLICY "secure_api_keys_insert" 
ON public.user_api_keys 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id AND
  provider IS NOT NULL AND
  encrypted_key IS NOT NULL
);

CREATE POLICY "secure_api_keys_update" 
ON public.user_api_keys 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
);

CREATE POLICY "secure_api_keys_delete" 
ON public.user_api_keys 
FOR DELETE 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
);

-- Service role policy for edge functions
CREATE POLICY "service_role_api_keys_access" 
ON public.user_api_keys 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Strengthen payments table RLS policies
DROP POLICY IF EXISTS "admins_all_payments_select" ON public.payments;
DROP POLICY IF EXISTS "authenticated_users_own_payments_select" ON public.payments;
DROP POLICY IF EXISTS "service_role_payments_insert" ON public.payments;
DROP POLICY IF EXISTS "service_role_payments_update" ON public.payments;

-- Create ultra-secure payment policies
CREATE POLICY "secure_payments_user_select" 
ON public.payments 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id AND
  status IN ('pending', 'succeeded', 'failed', 'canceled')
);

CREATE POLICY "secure_payments_admin_select" 
ON public.payments 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'::app_role
  )
);

CREATE POLICY "secure_payments_service_insert" 
ON public.payments 
FOR INSERT 
TO service_role
WITH CHECK (
  user_id IS NOT NULL AND
  package_name IS NOT NULL AND
  amount > 0 AND
  tokens_amount > 0
);

CREATE POLICY "secure_payments_service_update" 
ON public.payments 
FOR UPDATE 
TO service_role
USING (true)
WITH CHECK (
  status IN ('pending', 'succeeded', 'failed', 'canceled')
);

-- Add additional security constraints
ALTER TABLE public.user_api_keys ADD CONSTRAINT check_provider_not_empty 
CHECK (provider IS NOT NULL AND trim(provider) != '');

ALTER TABLE public.user_api_keys ADD CONSTRAINT check_encrypted_key_not_empty 
CHECK (encrypted_key IS NOT NULL AND trim(encrypted_key) != '');

-- Add payment security constraints
ALTER TABLE public.payments ADD CONSTRAINT check_positive_amount 
CHECK (amount > 0);

ALTER TABLE public.payments ADD CONSTRAINT check_positive_tokens 
CHECK (tokens_amount > 0);

ALTER TABLE public.payments ADD CONSTRAINT check_valid_status 
CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled'));

-- Create audit trigger for API key changes
CREATE OR REPLACE FUNCTION public.audit_api_key_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.log_audit_event(
            auth.uid(),
            'api_key_created',
            'user_api_keys',
            NEW.id::text,
            NULL,
            jsonb_build_object('provider', NEW.provider, 'user_id', NEW.user_id)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.log_audit_event(
            auth.uid(),
            'api_key_updated',
            'user_api_keys',
            NEW.id::text,
            jsonb_build_object('is_active', OLD.is_active),
            jsonb_build_object('is_active', NEW.is_active)
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.log_audit_event(
            auth.uid(),
            'api_key_deleted',
            'user_api_keys',
            OLD.id::text,
            jsonb_build_object('provider', OLD.provider, 'user_id', OLD.user_id),
            NULL
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER audit_api_key_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.user_api_keys
    FOR EACH ROW EXECUTE FUNCTION public.audit_api_key_changes();

-- Create audit trigger for payment changes
CREATE OR REPLACE FUNCTION public.audit_payment_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.log_audit_event(
            NULL, -- System operation
            'payment_created',
            'payments',
            NEW.id::text,
            NULL,
            jsonb_build_object('user_id', NEW.user_id, 'amount', NEW.amount, 'package_name', NEW.package_name)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.log_audit_event(
            NULL, -- System operation
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
$$;

CREATE TRIGGER audit_payment_changes_trigger
    AFTER INSERT OR UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.audit_payment_changes();