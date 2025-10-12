-- Create secure admin function to update user tokens
CREATE OR REPLACE FUNCTION public.admin_update_user_tokens(
  target_user_id uuid,
  new_balance integer,
  reason text DEFAULT 'Корректировка баланса администратором'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN;
  old_balance INTEGER;
  difference INTEGER;
BEGIN
  -- Verify caller is admin
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Validate new balance
  IF new_balance < 0 THEN
    RAISE EXCEPTION 'Token balance cannot be negative';
  END IF;
  
  -- Get old balance
  SELECT tokens_balance INTO old_balance
  FROM profiles
  WHERE id = target_user_id;
  
  IF old_balance IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Calculate difference
  difference := new_balance - old_balance;
  
  -- Update tokens balance
  UPDATE profiles
  SET tokens_balance = new_balance,
      updated_at = now()
  WHERE id = target_user_id;
  
  -- Log the transaction
  INSERT INTO token_transactions (user_id, amount, transaction_type, description)
  VALUES (
    target_user_id,
    difference,
    CASE WHEN difference > 0 THEN 'admin_bonus' ELSE 'admin_adjustment' END,
    reason || ': ' || CASE WHEN difference > 0 THEN '+' ELSE '' END || difference || ' токенов'
  );
  
  -- Log to security events
  PERFORM log_security_event(
    auth.uid(),
    'admin_token_update',
    'Admin updated user tokens: ' || target_user_id::text,
    NULL,
    NULL,
    jsonb_build_object(
      'target_user', target_user_id,
      'old_balance', old_balance,
      'new_balance', new_balance,
      'difference', difference
    )
  );
  
  RETURN true;
END;
$$;

-- Create secure admin function to toggle user block status
CREATE OR REPLACE FUNCTION public.admin_toggle_user_block(
  target_user_id uuid,
  block_status boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Verify caller is admin
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Update block status
  UPDATE profiles
  SET is_blocked = block_status,
      updated_at = now()
  WHERE id = target_user_id;
  
  -- Log to security events
  PERFORM log_security_event(
    auth.uid(),
    CASE WHEN block_status THEN 'admin_user_blocked' ELSE 'admin_user_unblocked' END,
    'Admin ' || CASE WHEN block_status THEN 'blocked' ELSE 'unblocked' END || ' user: ' || target_user_id::text,
    NULL,
    NULL,
    jsonb_build_object(
      'target_user', target_user_id,
      'blocked', block_status
    )
  );
  
  RETURN true;
END;
$$;