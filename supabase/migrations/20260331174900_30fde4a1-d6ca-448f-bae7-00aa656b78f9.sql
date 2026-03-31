ALTER TABLE public.invoice_payments 
  ADD COLUMN IF NOT EXISTS tochka_document_id text,
  ADD COLUMN IF NOT EXISTS tochka_status text;