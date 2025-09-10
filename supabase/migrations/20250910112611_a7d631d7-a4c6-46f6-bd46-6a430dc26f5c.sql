-- Remove the potentially problematic security definer view
-- The explicit deny policies are sufficient for the security fix
DROP VIEW IF EXISTS public.profile_safe;

-- The explicit deny policies we added are sufficient to prevent anonymous/public access:
-- 1. "Deny anonymous access to profiles" - prevents anon role access
-- 2. "Deny public access to profiles" - prevents public role access  
-- 3. Existing authenticated user policies still work properly

-- Add additional comment to clarify the security model
COMMENT ON TABLE public.profiles IS 'User profile data with explicit RLS policies: authenticated users can only access their own data, admins can access all data, anonymous/public access is explicitly denied';