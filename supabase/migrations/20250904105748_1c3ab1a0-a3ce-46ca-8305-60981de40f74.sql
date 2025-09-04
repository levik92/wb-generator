-- Create storage bucket for generated cards if it doesn't exist
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('generated-cards', 'generated-cards', true)
    ON CONFLICT (id) DO NOTHING;
END $$;

-- Storage policies for generated-cards bucket
CREATE POLICY "Allow public read access to generated cards"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated-cards');

-- Only service role can upload to generated-cards bucket
CREATE POLICY "Only service role can upload generated cards"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'generated-cards' 
  AND auth.role() = 'service_role'
);

-- Only service role can update generated cards
CREATE POLICY "Only service role can update generated cards"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'generated-cards' 
  AND auth.role() = 'service_role'
);

-- Only service role can delete generated cards
CREATE POLICY "Only service role can delete generated cards"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'generated-cards' 
  AND auth.role() = 'service_role'
);