-- Make generated-cards bucket public so images can be accessed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'generated-cards';

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Generated cards are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload generated cards" ON storage.objects;

-- Create policies for generated-cards bucket
CREATE POLICY "Generated cards are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'generated-cards');

CREATE POLICY "Users can upload generated cards" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'generated-cards' AND auth.uid() IS NOT NULL);