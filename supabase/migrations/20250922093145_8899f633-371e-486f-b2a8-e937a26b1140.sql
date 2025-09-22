-- Fix profiles table RLS policies to explicitly require authentication
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

-- Create more secure policies with explicit authentication checks
CREATE POLICY "authenticated_users_can_view_own_profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "admins_can_view_all_profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'::app_role
  )
);

CREATE POLICY "authenticated_users_can_insert_own_profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "authenticated_users_can_update_own_profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "admins_can_update_profiles" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'::app_role
  )
);

-- Ensure RLS is enabled (should already be enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;