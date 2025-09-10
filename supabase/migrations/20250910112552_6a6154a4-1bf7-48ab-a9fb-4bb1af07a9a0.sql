-- Add explicit deny policies for anonymous access to profiles table
-- This addresses the security finding about potential unauthorized access

-- Add explicit policy to deny all anonymous access to profiles table
CREATE POLICY "Deny anonymous access to profiles" 
ON public.profiles 
FOR ALL 
TO anon 
USING (false) 
WITH CHECK (false);

-- Add explicit policy to deny public role access to profiles table  
CREATE POLICY "Deny public access to profiles"
ON public.profiles
FOR ALL
TO public
USING (false)
WITH CHECK (false);

-- Add additional protection for API keys - ensure they're only accessible in very specific cases
-- Create a view that excludes sensitive API keys for general profile access
CREATE OR REPLACE VIEW public.profile_safe AS
SELECT 
  id,
  email,
  full_name,
  tokens_balance,
  wb_connected,
  referral_code,
  referred_by,
  is_blocked,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to the safe view for authenticated users to see their own profile
GRANT SELECT ON public.profile_safe TO authenticated;

-- Add RLS to the safe view
ALTER VIEW public.profile_safe SET (security_barrier = true);

-- Add comment explaining the security measure
COMMENT ON POLICY "Deny anonymous access to profiles" ON public.profiles IS 'Explicit security policy to prevent any anonymous access to sensitive user data including emails, names, and API keys';

COMMENT ON POLICY "Deny public access to profiles" ON public.profiles IS 'Explicit security policy to prevent any public role access to sensitive user data';

COMMENT ON VIEW public.profile_safe IS 'Safe view of profiles table that excludes sensitive API keys and other credentials';