
ALTER TABLE public.video_generation_jobs
  ADD COLUMN IF NOT EXISTS product_image_url TEXT,
  ADD COLUMN IF NOT EXISTS prompt TEXT;
