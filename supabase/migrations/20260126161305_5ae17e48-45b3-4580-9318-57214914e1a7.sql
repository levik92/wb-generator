-- Add admin_tag column to bonus_programs table for internal admin display
ALTER TABLE public.bonus_programs 
ADD COLUMN admin_tag text DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.bonus_programs.admin_tag IS 'Internal tag shown in admin panel instead of title for tasks list';