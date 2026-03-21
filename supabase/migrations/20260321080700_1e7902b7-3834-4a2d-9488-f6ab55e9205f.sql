
-- Edge-function-compatible encryption/decryption functions that accept key as parameter
CREATE OR REPLACE FUNCTION public.encrypt_support_message_edge(content text, enc_key text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN pgp_sym_encrypt(content, enc_key);
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_support_message_edge(encrypted bytea, enc_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN pgp_sym_decrypt(encrypted, enc_key);
END;
$$;
