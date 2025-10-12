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
  tx_type TEXT;
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

  -- Choose transaction type compatible with CHECK constraint
  -- Use 'bonus' for both directions to avoid affecting 'generation' analytics
  tx_type := 'bonus';

  -- Log the transaction only when there is a change
  IF difference <> 0 THEN
    INSERT INTO token_transactions (user_id, amount, transaction_type, description)
    VALUES (
      target_user_id,
      difference,
      tx_type,
      reason || ': ' || CASE WHEN difference > 0 THEN '+' ELSE '' END || difference || ' токенов'
    );
  END IF;

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