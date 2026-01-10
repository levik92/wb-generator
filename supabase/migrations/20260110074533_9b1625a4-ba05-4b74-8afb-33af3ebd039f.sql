-- Drop conflicting policies for generated-cards INSERT
DROP POLICY IF EXISTS "Only service role can upload generated cards" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload generated cards" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own generated cards" ON storage.objects;

-- Create a new unified INSERT policy that allows:
-- 1. Service role (for edge functions) to upload anywhere in generated-cards
-- 2. Authenticated users to upload to their own folder
CREATE POLICY "Allow service role and users to upload generated cards" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'generated-cards' 
  AND (
    auth.role() = 'service_role' 
    OR (auth.uid() IS NOT NULL AND (auth.uid())::text = (storage.foldername(name))[1])
  )
);