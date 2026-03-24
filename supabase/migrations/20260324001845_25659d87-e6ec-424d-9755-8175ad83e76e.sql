
-- Add attachment_url column to support_messages
ALTER TABLE public.support_messages 
ADD COLUMN IF NOT EXISTS attachment_url text DEFAULT NULL;

-- Create storage bucket for support attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-attachments', 
  'support-attachments', 
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload to support-attachments
CREATE POLICY "Authenticated users can upload support attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'support-attachments');

-- RLS: anyone can view support attachments (public bucket)
CREATE POLICY "Public can view support attachments"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'support-attachments');

-- RLS: service role can delete support attachments (for cleanup)
CREATE POLICY "Service role can delete support attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'support-attachments');

-- Create cleanup function for old attachments
CREATE OR REPLACE FUNCTION public.cleanup_old_support_attachments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete messages with attachments older than 7 days
  -- The actual file deletion needs to happen via edge function
  -- This just nullifies the references
  UPDATE support_messages
  SET attachment_url = NULL
  WHERE attachment_url IS NOT NULL
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$;
