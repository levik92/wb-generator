DROP FUNCTION IF EXISTS public.decrypt_support_message_edge(bytea, text);

CREATE OR REPLACE FUNCTION public.decrypt_support_message_edge(encrypted text, enc_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN extensions.pgp_sym_decrypt(decode(encrypted, 'base64')::bytea, enc_key);
END;
$function$;