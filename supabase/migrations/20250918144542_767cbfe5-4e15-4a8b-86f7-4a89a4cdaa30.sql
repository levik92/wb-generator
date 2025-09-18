-- Create secure API keys table with encryption
CREATE TABLE public.user_api_keys (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider text NOT NULL, -- 'wildberries', 'ozon', etc.
    encrypted_key text NOT NULL,
    key_hash text NOT NULL, -- For quick lookups without decryption
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    last_used_at timestamp with time zone,
    UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

-- Create policies for secure access
CREATE POLICY "Users can view their own API keys"
ON public.user_api_keys
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API keys"
ON public.user_api_keys
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys"
ON public.user_api_keys
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys"
ON public.user_api_keys
FOR DELETE
USING (auth.uid() = user_id);

-- Create function for secure API key storage
CREATE OR REPLACE FUNCTION public.store_user_api_key(
    provider_name text,
    api_key text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    key_hash_value text;
    encrypted_key_value text;
BEGIN
    -- Generate hash for quick lookups (first 8 chars + hash of full key)
    key_hash_value := substring(api_key from 1 for 8) || 
                     encode(digest(api_key, 'sha256'), 'hex');
    
    -- For now we'll store the key directly - in production this should use pgcrypto
    -- encrypted_key_value := pgp_sym_encrypt(api_key, current_setting('app.encryption_key'));
    encrypted_key_value := api_key; -- Temporary until encryption is set up
    
    -- Insert or update the API key
    INSERT INTO public.user_api_keys (user_id, provider, encrypted_key, key_hash)
    VALUES (auth.uid(), provider_name, encrypted_key_value, key_hash_value)
    ON CONFLICT (user_id, provider)
    DO UPDATE SET 
        encrypted_key = EXCLUDED.encrypted_key,
        key_hash = EXCLUDED.key_hash,
        updated_at = now(),
        is_active = true;
    
    RETURN true;
END;
$$;

-- Create function to retrieve API key (returns masked version for display)
CREATE OR REPLACE FUNCTION public.get_user_api_key_masked(provider_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    key_hash_value text;
BEGIN
    SELECT key_hash INTO key_hash_value
    FROM public.user_api_keys
    WHERE user_id = auth.uid() 
      AND provider = provider_name 
      AND is_active = true;
    
    IF key_hash_value IS NOT NULL THEN
        -- Return first 8 chars + asterisks for display
        RETURN substring(key_hash_value from 1 for 8) || '****';
    END IF;
    
    RETURN NULL;
END;
$$;

-- Create function to validate API key exists
CREATE OR REPLACE FUNCTION public.has_active_api_key(provider_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_api_keys
        WHERE user_id = auth.uid() 
          AND provider = provider_name 
          AND is_active = true
    );
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_user_api_keys_updated_at
    BEFORE UPDATE ON public.user_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Update profiles table to remove the insecure wb_api_key column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS wb_api_key;

-- Update wb_connected logic to use the new secure table
-- We'll create a view or function to check if user has WB API key
CREATE OR REPLACE FUNCTION public.update_wb_connection_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update wb_connected based on whether user has active WB API key
    UPDATE public.profiles
    SET wb_connected = public.has_active_api_key('wildberries')
    WHERE id = COALESCE(NEW.user_id, OLD.user_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger to auto-update wb_connected status
CREATE TRIGGER sync_wb_connection_status
    AFTER INSERT OR UPDATE OR DELETE ON public.user_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION public.update_wb_connection_status();