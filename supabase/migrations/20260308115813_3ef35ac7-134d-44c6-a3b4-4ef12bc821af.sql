
-- Create atomic function for promo code token crediting
CREATE OR REPLACE FUNCTION public.redeem_promocode_tokens(p_user_id UUID, p_amount INTEGER, p_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set bypass flag so the protect_tokens_on_update trigger allows the update
  PERFORM set_config('app.bypass_token_protection', 'true', true);
  
  -- Update balance
  UPDATE profiles 
  SET tokens_balance = tokens_balance + p_amount,
      updated_at = now()
  WHERE id = p_user_id;
  
  -- Log transaction with correct type
  INSERT INTO token_transactions (user_id, amount, transaction_type, description)
  VALUES (p_user_id, p_amount, 'promocode', 'Активация промокода ' || p_code || ': +' || p_amount || ' токенов');
END;
$$;
