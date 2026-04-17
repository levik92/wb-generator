UPDATE public.profiles
SET last_active_at = CASE
  WHEN login_count > 0 THEN updated_at
  ELSE created_at
END;