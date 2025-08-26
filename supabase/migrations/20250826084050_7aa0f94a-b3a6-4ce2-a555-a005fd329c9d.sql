-- Create storage bucket for generated cards
INSERT INTO storage.buckets (id, name, public) 
VALUES ('generated-cards', 'generated-cards', false);

-- Create RLS policies for generated cards bucket
CREATE POLICY "Users can view their own generated cards"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated-cards' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own generated cards"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'generated-cards' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own generated cards"
ON storage.objects FOR UPDATE
USING (bucket_id = 'generated-cards' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own generated cards"
ON storage.objects FOR DELETE
USING (bucket_id = 'generated-cards' AND auth.uid()::text = (storage.foldername(name))[1]);