-- Drop old function and recreate without implicit limit
DROP FUNCTION IF EXISTS public.admin_get_all_users();

CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  tokens_balance integer,
  referral_code text,
  wb_connected boolean,
  is_blocked boolean,
  created_at timestamptz,
  updated_at timestamptz,
  referred_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Log the access
  PERFORM public.log_security_event(
    auth.uid(),
    'admin_list_users',
    'Admin accessed full user list',
    NULL,
    NULL,
    jsonb_build_object('action', 'list_all_users')
  );
  
  -- Return all user profiles without limit
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.tokens_balance,
    p.referral_code,
    p.wb_connected,
    p.is_blocked,
    p.created_at,
    p.updated_at,
    p.referred_by
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- Also add RLS policy for admins to directly query profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'::app_role
  )
);