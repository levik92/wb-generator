
-- Create storage bucket for service friends logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('service_friends_logos', 'service_friends_logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view logos (public bucket)
CREATE POLICY "Anyone can view service friend logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'service_friends_logos');

-- Admins can upload logos
CREATE POLICY "Admins can upload service friend logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'service_friends_logos'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Admins can update logos
CREATE POLICY "Admins can update service friend logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'service_friends_logos'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Admins can delete logos
CREATE POLICY "Admins can delete service friend logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'service_friends_logos'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);
