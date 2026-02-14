
-- 1. RLS policy DELETE for video_generation_jobs
CREATE POLICY "Users can delete their own video jobs"
ON public.video_generation_jobs
FOR DELETE
USING (auth.uid() = user_id);

-- 2. Update cleanup function to include video_generation_jobs
CREATE OR REPLACE FUNCTION public.cleanup_old_generations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete old generations (existing behavior)
  DELETE FROM public.generations
  WHERE created_at < NOW() - INTERVAL '1 month';

  -- Delete old generation jobs
  DELETE FROM public.generation_jobs
  WHERE created_at < NOW() - INTERVAL '1 month';

  -- Delete old generation tasks (cascade should handle, but explicit)
  DELETE FROM public.generation_tasks
  WHERE created_at < NOW() - INTERVAL '1 month';

  -- Delete old video generation jobs
  DELETE FROM public.video_generation_jobs
  WHERE created_at < NOW() - INTERVAL '1 month';
END;
$$;

-- 3. Insert video_regeneration pricing
INSERT INTO public.generation_pricing (price_type, tokens_cost, description)
VALUES ('video_regeneration', 2, 'Перегенерация видеообложки')
ON CONFLICT DO NOTHING;
