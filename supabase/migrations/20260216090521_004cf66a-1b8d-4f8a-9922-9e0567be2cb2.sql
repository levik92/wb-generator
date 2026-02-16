
-- 1. Update CHECK constraint to include 'direct_sql_update'
ALTER TABLE token_transactions DROP CONSTRAINT IF EXISTS token_transactions_transaction_type_check;
ALTER TABLE token_transactions ADD CONSTRAINT token_transactions_transaction_type_check
  CHECK (transaction_type = ANY (ARRAY[
    'purchase', 'generation', 'refund', 'promocode',
    'referral_bonus', 'bonus', 'direct_sql_update'
  ]));

-- 2. Update trigger function to skip when bypass flag is set
CREATE OR REPLACE FUNCTION public.track_token_balance_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  balance_diff INTEGER;
  existing_record_id UUID;
BEGIN
  -- If bypass_token_protection is set, a legitimate function already logged the transaction
  IF current_setting('app.bypass_token_protection', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Otherwise this is a direct SQL modification - log it
  PERFORM set_config('app.bypass_token_protection', 'true', true);

  balance_diff := NEW.tokens_balance - OLD.tokens_balance;

  -- Dedup check
  SELECT id INTO existing_record_id
  FROM token_transactions
  WHERE user_id = NEW.id
    AND amount = balance_diff
    AND created_at > now() - interval '2 seconds'
  LIMIT 1;

  IF existing_record_id IS NULL THEN
    INSERT INTO token_transactions (user_id, amount, transaction_type, description)
    VALUES (
      NEW.id,
      balance_diff,
      'direct_sql_update',
      'Прямое изменение баланса (обход системы): ' || OLD.tokens_balance || ' -> ' || NEW.tokens_balance
    );

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
$function$;
