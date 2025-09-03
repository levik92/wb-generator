-- Enable realtime for generation tables
ALTER TABLE public.generation_jobs REPLICA IDENTITY FULL;
ALTER TABLE public.generation_tasks REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_tasks;