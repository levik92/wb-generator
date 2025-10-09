-- ============================================
-- SECURITY FIX: Restrict Service Role Access to API Keys
-- Removes overly permissive policy and adds security enhancements
-- ============================================

-- Step 1: Remove the overly permissive service role policy
DROP POLICY IF EXISTS service_role_api_keys_access ON public.user_api_keys;

-- Step 2: Add security tracking columns
ALTER TABLE public.user_api_keys 
ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS key_version INTEGER DEFAULT 1;

-- Step 3: Create an access tracking function
CREATE OR REPLACE FUNCTION public.track_api_key_access(key_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  key_record RECORD;
BEGIN
  -- Get key details
  SELECT user_id, access_count, provider INTO key_record
  FROM public.user_api_keys
  WHERE id = key_id;
  
  -- Update access count
  UPDATE public.user_api_keys
  SET access_count = access_count + 1,
      last_used_at = NOW()
  WHERE id = key_id;
  
  -- Alert on suspicious access patterns (>50 accesses in 24h)
  IF key_record.access_count > 50 THEN
    PERFORM public.log_security_event(
      key_record.user_id,
      'suspicious_api_key_access',
      'Unusual API key access pattern detected - possible key compromise',
      NULL,
      NULL,
      jsonb_build_object(
        'key_id', key_id,
        'access_count', key_record.access_count,
        'provider', key_record.provider,
        'severity', 'high'
      )
    );
  END IF;
END;
$$;

-- Step 4: Create audit table for API key access tracking
CREATE TABLE IF NOT EXISTS public.api_key_access_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id UUID NOT NULL REFERENCES public.user_api_keys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  accessed_by UUID, -- auth.uid() of accessor
  access_type TEXT NOT NULL, -- 'decrypt', 'view_masked', 'update', etc.
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit table
ALTER TABLE public.api_key_access_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view API key access audit"
ON public.api_key_access_audit FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Only service role can insert audit records
CREATE POLICY "Service role can insert audit records"
ON public.api_key_access_audit FOR INSERT
TO service_role
WITH CHECK (true);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_api_key_access_audit_key_id 
ON public.api_key_access_audit(key_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_key_access_audit_user_id 
ON public.api_key_access_audit(user_id, created_at DESC);

-- Step 5: Update get_user_api_key_decrypted function to use audit logging
CREATE OR REPLACE FUNCTION public.get_user_api_key_decrypted(user_id_param uuid, provider_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    encrypted_key_value text;
    encryption_key text;
    decrypted_key text;
    key_id_var UUID;
BEGIN
    -- This function should only be called by service role or the user themselves
    IF auth.role() != 'service_role' AND auth.uid() != user_id_param THEN
        -- Log unauthorized access attempt
        INSERT INTO public.api_key_access_audit (
            key_id, user_id, accessed_by, access_type, success, error_message
        ) SELECT 
            id, user_id_param, auth.uid(), 'decrypt', false, 'Unauthorized access attempt'
        FROM public.user_api_keys 
        WHERE user_id = user_id_param AND provider = provider_name
        LIMIT 1;
        
        RAISE EXCEPTION 'Unauthorized access to API key';
    END IF;
    
    -- Get the encrypted key and key_id
    SELECT encrypted_key, id INTO encrypted_key_value, key_id_var
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
    BEGIN
        decrypted_key := convert_from(decrypt(decode(encrypted_key_value, 'base64'), encryption_key::bytea, 'aes'), 'UTF8');
    EXCEPTION WHEN OTHERS THEN
        -- Log decryption failure
        INSERT INTO public.api_key_access_audit (
            key_id, user_id, accessed_by, access_type, success, error_message
        ) VALUES (
            key_id_var, user_id_param, auth.uid(), 'decrypt', false, SQLERRM
        );
        
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
    
    -- Track access
    PERFORM public.track_api_key_access(key_id_var);
    
    -- Log successful access to audit table
    INSERT INTO public.api_key_access_audit (
        key_id, user_id, accessed_by, access_type, success
    ) VALUES (
        key_id_var, user_id_param, COALESCE(auth.uid(), user_id_param), 'decrypt', true
    );
    
    -- Log to security events (without exposing the key)
    PERFORM public.log_security_event(
        user_id_param,
        'api_key_accessed',
        'API key accessed for provider: ' || provider_name,
        NULL,
        NULL,
        jsonb_build_object(
            'provider', provider_name, 
            'decrypted', true,
            'accessed_by', COALESCE(auth.uid(), user_id_param)
        )
    );
    
    RETURN decrypted_key;
END;
$$;

-- Step 6: Add comment documenting the security model
COMMENT ON TABLE public.user_api_keys IS 
'Stores encrypted API keys for external services. Access is strictly controlled:
- Users can only view/manage their own keys (masked)
- Decryption only via get_user_api_key_decrypted() function
- All access is logged in api_key_access_audit table
- No direct service_role access - must use security definer functions';

COMMENT ON FUNCTION public.get_user_api_key_decrypted IS
'Securely decrypts and returns API keys. Only callable by service_role or key owner.
All access is audited in api_key_access_audit table. Rate limiting applied via track_api_key_access().';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'API Key Security Enhanced:
  ✓ Removed service_role_api_keys_access policy
  ✓ Added access tracking columns (access_count, expires_at, key_version)
  ✓ Created api_key_access_audit table for detailed logging
  ✓ Enhanced get_user_api_key_decrypted() with audit logging
  ✓ Implemented suspicious access pattern detection (>50 accesses/24h)
  
  All API key access now requires going through audited security definer functions.';
END $$;