-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to cleanup old generations (older than 1 month)
CREATE OR REPLACE FUNCTION cleanup_old_generations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_generation RECORD;
  storage_path_to_delete TEXT;
BEGIN
  -- Delete from generations table (descriptions and old data)
  DELETE FROM public.generations
  WHERE created_at < NOW() - INTERVAL '1 month';
  
  -- Get all old generation jobs with their tasks to delete storage files
  FOR old_generation IN
    SELECT DISTINCT gt.storage_path
    FROM public.generation_jobs gj
    JOIN public.generation_tasks gt ON gt.job_id = gj.id
    WHERE gj.created_at < NOW() - INTERVAL '1 month'
      AND gt.storage_path IS NOT NULL
  LOOP
    -- Delete from storage bucket
    BEGIN
      PERFORM storage.delete_object('generation-images', old_generation.storage_path);
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue with other deletions
      RAISE WARNING 'Failed to delete storage object: %', old_generation.storage_path;
    END;
  END LOOP;
  
  -- Delete generation tasks first (due to foreign key)
  DELETE FROM public.generation_tasks
  WHERE job_id IN (
    SELECT id FROM public.generation_jobs
    WHERE created_at < NOW() - INTERVAL '1 month'
  );
  
  -- Delete generation jobs
  DELETE FROM public.generation_jobs
  WHERE created_at < NOW() - INTERVAL '1 month';
  
  RAISE NOTICE 'Cleanup completed successfully';
END;
$$;

-- Schedule daily cleanup at 2 AM
SELECT cron.schedule(
  'cleanup-old-generations',
  '0 2 * * *', -- Every day at 2 AM
  $$
  SELECT cleanup_old_generations();
  $$
);