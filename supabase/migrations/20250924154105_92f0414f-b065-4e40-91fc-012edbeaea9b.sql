-- Fix critical security issue: Customer Email Addresses Exposed to Public
-- Remove all existing conflicting RLS policies on profiles table and create secure ones

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "deny_anonymous_access_to_profiles" ON public.profiles;
DROP POLICY IF EXISTS "restrict_sensitive_profile_data" ON public.profiles;
DROP POLICY IF EXISTS "restrict_service_role_profile_access" ON public.profiles;
DROP POLICY IF EXISTS "secure_admins_update_profiles" ON public.profiles;
DROP POLICY IF EXISTS "secure_admins_view_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "secure_users_insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "secure_users_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "secure_users_view_own_profile" ON public.profiles;

-- Create new, secure RLS policies for profiles table
-- 1. SELECT policy: Users can only view their own profile, admins can view all profiles
CREATE POLICY "secure_profiles_select" ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id 
  OR 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'::app_role
  )
);

-- 2. INSERT policy: Users can only create their own profile during registration
CREATE POLICY "secure_profiles_insert" ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 3. UPDATE policy: Users can update their own profile, admins can update any profile
CREATE POLICY "secure_profiles_update" ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id 
  OR 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'::app_role
  )
)
WITH CHECK (
  auth.uid() = id 
  OR 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'::app_role
  )
);

-- 4. DELETE policy: Only admins can delete profiles
CREATE POLICY "secure_profiles_delete" ON public.profiles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'::app_role
  )
);

-- 5. Ensure service role has full access for system operations
CREATE POLICY "service_role_profiles_access" ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add additional security: Create a function to get public profile data (without email)
-- This can be used for features that need to show user info publicly
CREATE OR REPLACE FUNCTION public.get_public_profile_info(profile_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  created_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    profiles.id,
    profiles.full_name,
    profiles.created_at
  FROM public.profiles
  WHERE profiles.id = profile_id
    AND profiles.is_blocked = false;
$$;

-- Log this security fix
INSERT INTO public.security_events (
  user_id,
  event_type,
  event_description,
  metadata
) VALUES (
  NULL,
  'security_fix_applied',
  'Fixed critical security vulnerability: Customer Email Addresses Exposed to Public',
  jsonb_build_object(
    'issue_id', 'PUBLIC_USER_DATA',
    'fix_type', 'rls_policy_update',
    'table_affected', 'profiles',
    'severity', 'critical'
  )
);