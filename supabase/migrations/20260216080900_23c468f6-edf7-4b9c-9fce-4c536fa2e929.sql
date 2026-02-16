
-- Function to track any direct changes to tokens_balance
CREATE OR REPLACE FUNCTION public.track_token_balance_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  balance_diff INTEGER;
  existing_record_id UUID;
BEGIN
  balance_diff := NEW.tokens_balance - OLD.tokens_balance;

  -- Check if a matching token_transaction was already created in the last 2 seconds
  -- (by admin_update_user_tokens or other legitimate functions)
  SELECT id INTO existing_record_id
  FROM token_transactions
  WHERE user_id = NEW.id
    AND amount = balance_diff
    AND created_at > now() - interval '2 seconds'
  LIMIT 1;

  -- If no recent matching record exists, this is a direct SQL update
  IF existing_record_id IS NULL THEN
    -- Log to token_transactions
    INSERT INTO token_transactions (user_id, amount, transaction_type, description)
    VALUES (
      NEW.id,
      balance_diff,
      'direct_sql_update',
      'Прямое изменение баланса (обход системы): ' || OLD.tokens_balance || ' -> ' || NEW.tokens_balance
    );

    -- Log to security_events
    INSERT INTO security_events (user_id, event_type, event_description, metadata)
    VALUES (
      NEW.id,
      'direct_balance_modification',
      'Обнаружено прямое изменение баланса токенов без использования штатных функций',
      jsonb_build_object(
        'old_balance', OLD.tokens_balance,
        'new_balance', NEW.tokens_balance,
        'difference', balance_diff,
        'detected_at', now()
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
CREATE TRIGGER on_tokens_balance_change
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.tokens_balance IS DISTINCT FROM NEW.tokens_balance)
  EXECUTE FUNCTION public.track_token_balance_change();
