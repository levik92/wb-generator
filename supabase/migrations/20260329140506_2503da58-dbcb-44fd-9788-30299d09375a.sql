
CREATE OR REPLACE FUNCTION public.nextval_invoice_number()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nextval('invoice_number_seq');
$$;
