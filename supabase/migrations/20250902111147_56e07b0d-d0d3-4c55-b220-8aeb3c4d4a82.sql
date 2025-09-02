-- Make generated-cards bucket public so images can be accessed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'generated-cards';

-- Create policies for generated-cards bucket if they don't exist
CREATE POLICY IF NOT EXISTS "Generated cards are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'generated-cards');

CREATE POLICY IF NOT EXISTS "Users can upload generated cards" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'generated-cards' AND auth.uid() IS NOT NULL);