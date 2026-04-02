CREATE OR REPLACE FUNCTION public.cleanup_old_generations()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Storage file deletion is now handled by the cleanup-old-storage edge function
  -- via the Storage API (supabase.storage.remove), because direct SQL deletion
  -- from storage.objects is blocked by the storage.protect_delete() trigger.

  -- Step 1: Delete generation tasks for old jobs
  DELETE FROM generation_tasks
  WHERE job_id IN (
    SELECT id FROM generation_jobs
    WHERE created_at < now() - interval '1 month'
  );

  -- Step 2: Delete old generation jobs
  DELETE FROM generation_jobs
  WHERE created_at < now() - interval '1 month';

  -- Step 3: Delete old generations
  DELETE FROM generations
  WHERE created_at < now() - interval '1 month';

  -- Step 4: Delete old video generation jobs
  DELETE FROM video_generation_jobs
  WHERE created_at < now() - interval '1 month';
END;
$function$;