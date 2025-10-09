-- ============================================
-- ADD: Function for admins to list all users
-- ============================================

-- Create function to get all users for admin dashboard
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE(
  id UUID,
  email TEXT,
  full_name TEXT,
  tokens_balance INT,
  referral_code TEXT,
  wb_connected BOOLEAN,
  is_blocked BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  referred_by UUID
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
  
  -- Return all user profiles
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

-- Add comment
COMMENT ON FUNCTION public.admin_get_all_users IS
'Returns list of all users for admin dashboard. Access is logged and restricted to admins only.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Created admin_get_all_users() function for listing users in admin panel';
END $$;