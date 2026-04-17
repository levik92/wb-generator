
-- Admins can view all generation jobs (for transaction detail popup in admin panel)
CREATE POLICY "Admins can view all generation jobs"
ON public.generation_jobs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Admins can view all generation tasks
CREATE POLICY "Admins can view all generation tasks"
ON public.generation_tasks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Admins can view all generations (text/SEO descriptions)
CREATE POLICY "Admins can view all generations"
ON public.generations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
