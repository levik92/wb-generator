-- Fix conflicting RLS policies on profiles table
-- Remove the problematic blanket deny policy for public role
DROP POLICY IF EXISTS "Deny public access to profiles" ON public.profiles;

-- The existing policies will properly handle access:
-- 1. "Deny anonymous access to profiles" blocks anon role (qual: false)
-- 2. User-specific policies on public role only work for authenticated users (auth.uid() conditions)
-- 3. Admin policy allows admin access

-- Add a comment to document the security model
COMMENT ON TABLE public.profiles IS 'Contains sensitive user data. Access restricted by RLS: anonymous users blocked completely, authenticated users can only access their own profile, admins can access all profiles.';