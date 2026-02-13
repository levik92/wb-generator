
-- Create video_generation_jobs table
CREATE TABLE public.video_generation_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  source_image_url TEXT,
  result_video_url TEXT,
  kling_task_id TEXT,
  tokens_cost INTEGER NOT NULL DEFAULT 10,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.video_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own video jobs"
  ON public.video_generation_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own video jobs"
  ON public.video_generation_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video jobs"
  ON public.video_generation_jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- Create storage bucket for generation images
INSERT INTO storage.buckets (id, name, public)
VALUES ('generation-images', 'generation-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Users can upload generation images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'generation-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read
CREATE POLICY "Generation images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'generation-images');

-- Allow users to update their own files
CREATE POLICY "Users can update own generation images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'generation-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own generation images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'generation-images' AND auth.uid()::text = (storage.foldername(name))[1]);
