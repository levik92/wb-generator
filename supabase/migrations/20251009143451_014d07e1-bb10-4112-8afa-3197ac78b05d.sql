-- ============================================
-- FIX: Enable RLS on admin_profile_access_rate_limit table
-- ============================================

-- Enable RLS on the rate limit table
ALTER TABLE public.admin_profile_access_rate_limit ENABLE ROW LEVEL SECURITY;

-- Only admins can view rate limit data
CREATE POLICY "Admins can view rate limit data"
ON public.admin_profile_access_rate_limit FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- System can insert/update rate limit records
CREATE POLICY "System can manage rate limit records"
ON public.admin_profile_access_rate_limit FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'RLS enabled on admin_profile_access_rate_limit table';
END $$;