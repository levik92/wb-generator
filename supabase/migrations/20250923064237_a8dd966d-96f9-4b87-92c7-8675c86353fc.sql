-- Add explicit deny policy for anonymous access to profiles table
-- This provides additional security layer beyond existing RLS policies

-- Create explicit restrictive policy to deny all anonymous access
CREATE POLICY "deny_anonymous_access_to_profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO PUBLIC
USING (auth.uid() IS NOT NULL);

-- Also add explicit policy to prevent service role from accessing profiles
-- unless explicitly needed (service role should use specific functions)
CREATE POLICY "restrict_service_role_profile_access"
ON public.profiles  
AS RESTRICTIVE
FOR ALL
TO service_role
USING (false); -- Explicitly deny service role direct access

-- Update existing user profile select policy to be more restrictive
-- and include additional checks for blocked users
DROP POLICY IF EXISTS "secure_users_view_own_profile" ON public.profiles;
CREATE POLICY "secure_users_view_own_profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id 
  AND is_blocked = false
);

-- Update admin view policy to include additional security checks  
DROP POLICY IF EXISTS "secure_admins_view_all_profiles" ON public.profiles;
CREATE POLICY "secure_admins_view_all_profiles"
ON public.profiles
FOR SELECT  
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'::app_role
  )
);

-- Add policy to prevent access to sensitive columns in profiles
-- This creates a view-like restriction on sensitive data
CREATE POLICY "restrict_sensitive_profile_data"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
TO PUBLIC  
USING (
  -- Only allow access if user is viewing their own profile or is admin
  (auth.uid() = id) OR 
  (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'::app_role
  ))
);