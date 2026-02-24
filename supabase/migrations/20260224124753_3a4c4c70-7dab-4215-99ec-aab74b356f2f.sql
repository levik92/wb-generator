ALTER TABLE video_generation_jobs 
  ADD COLUMN parent_job_id uuid REFERENCES video_generation_jobs(id) ON DELETE SET NULL;