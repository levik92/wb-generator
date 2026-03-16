
ALTER TABLE public.generation_jobs 
  ADD COLUMN IF NOT EXISTS unified_styling boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS style_description text NULL;
