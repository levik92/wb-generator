
DROP FUNCTION IF EXISTS public.encrypt_support_message_edge(text, text);
DROP FUNCTION IF EXISTS public.decrypt_support_message_edge(text, text);

CREATE FUNCTION public.encrypt_support_message_edge(content text, enc_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(extensions.pgp_sym_encrypt(content, enc_key)::bytea, 'base64');
END;
$$;

CREATE FUNCTION public.decrypt_support_message_edge(encrypted text, enc_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN extensions.pgp_sym_decrypt(decode(encrypted, 'base64')::bytea, enc_key);
END;
$$;
