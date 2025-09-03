-- Create tables for background job processing
CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE task_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'retrying');

-- Jobs table for batch card generation
CREATE TABLE public.generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    product_images JSONB DEFAULT '[]'::jsonb,
    status job_status DEFAULT 'pending',
    total_cards INTEGER DEFAULT 6,
    completed_cards INTEGER DEFAULT 0,
    tokens_cost INTEGER DEFAULT 6,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- Tasks table for individual card generation
CREATE TABLE public.generation_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.generation_jobs(id) ON DELETE CASCADE,
    card_index INTEGER NOT NULL,
    card_type TEXT NOT NULL,
    status task_status DEFAULT 'pending',
    prompt TEXT,
    image_url TEXT,
    storage_path TEXT,
    retry_count INTEGER DEFAULT 0,
    retry_after INTEGER, -- seconds to wait before retry
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT unique_job_card UNIQUE (job_id, card_index)
);

-- Enable Row Level Security
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for jobs
CREATE POLICY "Users can view their own jobs" 
ON public.generation_jobs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own jobs" 
ON public.generation_jobs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" 
ON public.generation_jobs 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for tasks
CREATE POLICY "Users can view tasks of their jobs" 
ON public.generation_tasks 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.generation_jobs 
        WHERE id = generation_tasks.job_id 
        AND user_id = auth.uid()
    )
);

-- Service role can manage all tasks (for background processing)
CREATE POLICY "Service role can manage all tasks" 
ON public.generation_tasks 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Service role can manage all jobs (for background processing)
CREATE POLICY "Service role can manage all jobs" 
ON public.generation_jobs 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Indexes for performance
CREATE INDEX idx_generation_jobs_user_id ON public.generation_jobs(user_id);
CREATE INDEX idx_generation_jobs_status ON public.generation_jobs(status);
CREATE INDEX idx_generation_tasks_job_id ON public.generation_tasks(job_id);
CREATE INDEX idx_generation_tasks_status ON public.generation_tasks(status);
CREATE INDEX idx_generation_tasks_retry ON public.generation_tasks(status, retry_after, retry_count);

-- Function to update job progress
CREATE OR REPLACE FUNCTION public.update_job_progress(job_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    completed_count INTEGER;
    total_count INTEGER;
    failed_count INTEGER;
BEGIN
    -- Count completed and failed tasks
    SELECT 
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'failed')
    INTO completed_count, total_count, failed_count
    FROM public.generation_tasks
    WHERE job_id = job_id_param;
    
    -- Update job progress
    UPDATE public.generation_jobs
    SET 
        completed_cards = completed_count,
        updated_at = now(),
        status = CASE 
            WHEN completed_count = total_count THEN 'completed'::job_status
            WHEN failed_count > 0 AND (completed_count + failed_count) = total_count THEN 'failed'::job_status
            WHEN completed_count > 0 THEN 'processing'::job_status
            ELSE status
        END,
        completed_at = CASE 
            WHEN completed_count = total_count THEN now()
            ELSE completed_at
        END
    WHERE id = job_id_param;
END;
$$;

-- Trigger to update job progress when tasks change
CREATE OR REPLACE FUNCTION public.trigger_update_job_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Update job progress
    PERFORM public.update_job_progress(COALESCE(NEW.job_id, OLD.job_id));
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_job_progress_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.generation_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_update_job_progress();

-- Trigger for updated_at
CREATE TRIGGER update_generation_jobs_updated_at
    BEFORE UPDATE ON public.generation_jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_generation_tasks_updated_at
    BEFORE UPDATE ON public.generation_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();