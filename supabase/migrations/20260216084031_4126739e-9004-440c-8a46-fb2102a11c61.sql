
-- 1. Create the protection trigger function
CREATE OR REPLACE FUNCTION public.protect_tokens_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tokens_balance IS DISTINCT FROM OLD.tokens_balance THEN
    IF current_setting('app.bypass_token_protection', true) IS DISTINCT FROM 'true' THEN
      -- Block the change
      NEW.tokens_balance := OLD.tokens_balance;
      -- Log the attempt
      INSERT INTO security_events (user_id, event_type, event_description, metadata)
      VALUES (
        NEW.id,
        'unauthorized_balance_change_blocked',
        'Попытка изменения баланса токенов заблокирована',
        jsonb_build_object(
          'attempted_balance', NEW.tokens_balance,
          'actual_balance', OLD.tokens_balance,
          'blocked_at', now()
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Create the BEFORE UPDATE trigger (runs before audit trigger)
DROP TRIGGER IF EXISTS protect_tokens_on_update ON public.profiles;
CREATE TRIGGER protect_tokens_on_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_tokens_balance();

-- 3. Update spend_tokens
CREATE OR REPLACE FUNCTION public.spend_tokens(user_id_param uuid, tokens_amount integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    PERFORM set_config('app.bypass_token_protection', 'true', true);

    UPDATE public.profiles
    SET tokens_balance = tokens_balance - tokens_amount,
        updated_at = now()
    WHERE id = user_id_param AND tokens_balance >= tokens_amount;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    INSERT INTO public.token_transactions (user_id, amount, transaction_type, description)
    VALUES (user_id_param, -tokens_amount, 'generation', 'Списание за генерацию');

    RETURN TRUE;
END;
$$;

-- 4. Update refund_tokens
CREATE OR REPLACE FUNCTION public.refund_tokens(user_id_param uuid, tokens_amount integer, reason_text text DEFAULT 'Возврат токенов')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    PERFORM set_config('app.bypass_token_protection', 'true', true);

    UPDATE public.profiles
    SET tokens_balance = tokens_balance + tokens_amount,
        updated_at = now()
    WHERE id = user_id_param;

    INSERT INTO public.token_transactions (user_id, amount, transaction_type, description)
    VALUES (user_id_param, tokens_amount, 'refund', reason_text);

    RETURN TRUE;
END;
$$;

-- 5. Update process_payment_success
CREATE OR REPLACE FUNCTION public.process_payment_success(payment_id_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    payment_record RECORD;
    promo_code_value TEXT;
BEGIN
    PERFORM set_config('app.bypass_token_protection', 'true', true);

    SELECT * INTO payment_record
    FROM public.payments
    WHERE yookassa_payment_id = payment_id_param
      AND status = 'pending';

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    UPDATE public.payments
    SET status = 'succeeded',
        confirmed_at = now(),
        updated_at = now()
    WHERE yookassa_payment_id = payment_id_param;

    UPDATE public.profiles
    SET tokens_balance = tokens_balance + payment_record.tokens_amount,
        updated_at = now()
    WHERE id = payment_record.user_id;

    INSERT INTO public.token_transactions (user_id, amount, transaction_type, description)
    VALUES (payment_record.user_id, payment_record.tokens_amount, 'purchase',
            'Пополнение баланса: ' || payment_record.package_name);

    IF payment_record.metadata ? 'promo' AND payment_record.metadata->'promo'->>'code' IS NOT NULL THEN
        promo_code_value := payment_record.metadata->'promo'->>'code';
    ELSIF payment_record.metadata ? 'promo_code' AND payment_record.metadata->>'promo_code' IS NOT NULL AND payment_record.metadata->>'promo_code' != '' THEN
        promo_code_value := payment_record.metadata->>'promo_code';
    END IF;

    IF promo_code_value IS NOT NULL THEN
        UPDATE public.promocodes
        SET current_uses = current_uses + 1,
            updated_at = now()
        WHERE code = promo_code_value;

        INSERT INTO public.promocode_uses (promocode_id, user_id)
        SELECT id, payment_record.user_id
        FROM public.promocodes
        WHERE code = promo_code_value
        ON CONFLICT (promocode_id, user_id) DO NOTHING;
    END IF;

    RETURN TRUE;
END;
$$;

-- 6. Update process_referral_bonus_on_payment
CREATE OR REPLACE FUNCTION public.process_referral_bonus_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    referrer_user_id UUID;
BEGIN
    IF NEW.status = 'succeeded' AND OLD.status = 'pending' THEN
        PERFORM set_config('app.bypass_token_protection', 'true', true);

        SELECT r.referrer_id INTO referrer_user_id
        FROM public.referrals r
        WHERE r.referred_id = NEW.user_id
          AND r.status = 'pending'
          AND NOT EXISTS (
            SELECT 1 FROM public.referrals_completed rc
            WHERE rc.referred_id = NEW.user_id
          );

        IF referrer_user_id IS NOT NULL THEN
            UPDATE public.profiles
            SET tokens_balance = tokens_balance + 15,
                updated_at = now()
            WHERE id = referrer_user_id;

            INSERT INTO public.token_transactions (user_id, amount, transaction_type, description)
            VALUES (referrer_user_id, 15, 'referral_bonus', 'Бонус за приведенного друга');

            UPDATE public.profiles
            SET tokens_balance = tokens_balance + 15,
                updated_at = now()
            WHERE id = NEW.user_id;

            INSERT INTO public.token_transactions (user_id, amount, transaction_type, description)
            VALUES (NEW.user_id, 15, 'referral_bonus', 'Бонус за первую оплату по реферальной ссылке');

            UPDATE public.referrals
            SET status = 'completed',
                tokens_awarded = 15
            WHERE referrer_id = referrer_user_id AND referred_id = NEW.user_id;

            INSERT INTO public.referrals_completed (referrer_id, referred_id, payment_id, tokens_awarded)
            VALUES (referrer_user_id, NEW.user_id, NEW.id, 15);
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- 7. Update approve_bonus_submission
CREATE OR REPLACE FUNCTION public.approve_bonus_submission(submission_id_param uuid, tokens_amount integer, admin_notes_param text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_program_id UUID;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  PERFORM set_config('app.bypass_token_protection', 'true', true);

  SELECT user_id, program_id INTO v_user_id, v_program_id
  FROM bonus_submissions
  WHERE id = submission_id_param AND status = 'pending';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Submission not found or already processed';
  END IF;

  UPDATE bonus_submissions
  SET status = 'approved',
      tokens_awarded = tokens_amount,
      admin_notes = admin_notes_param,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = submission_id_param;

  UPDATE profiles
  SET tokens_balance = tokens_balance + tokens_amount,
      updated_at = now()
  WHERE id = v_user_id;

  INSERT INTO token_transactions (user_id, amount, transaction_type, description)
  VALUES (v_user_id, tokens_amount, 'bonus', 'Бонус за выполнение задания');

  PERFORM log_security_event(
    auth.uid(),
    'bonus_approved',
    'Admin approved bonus submission',
    NULL,
    NULL,
    jsonb_build_object(
      'submission_id', submission_id_param,
      'user_id', v_user_id,
      'tokens', tokens_amount
    )
  );

  RETURN TRUE;
END;
$$;

-- 8. Update admin_update_user_tokens
CREATE OR REPLACE FUNCTION public.admin_update_user_tokens(target_user_id uuid, new_balance integer, reason text DEFAULT 'Корректировка баланса администратором')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_admin BOOLEAN;
  old_balance INTEGER;
  difference INTEGER;
  tx_type TEXT;
BEGIN
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_admin;
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  IF new_balance < 0 THEN
    RAISE EXCEPTION 'Token balance cannot be negative';
  END IF;

  PERFORM set_config('app.bypass_token_protection', 'true', true);

  SELECT tokens_balance INTO old_balance
  FROM profiles
  WHERE id = target_user_id;
  IF old_balance IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  difference := new_balance - old_balance;

  UPDATE profiles
  SET tokens_balance = new_balance,
      updated_at = now()
  WHERE id = target_user_id;

  tx_type := 'bonus';

  IF difference <> 0 THEN
    INSERT INTO token_transactions (user_id, amount, transaction_type, description)
    VALUES (
      target_user_id,
      difference,
      tx_type,
      reason || ': ' || CASE WHEN difference > 0 THEN '+' ELSE '' END || difference || ' токенов'
    );
  END IF;

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

-- 9. Update track_token_balance_change (audit trigger)
CREATE OR REPLACE FUNCTION public.track_token_balance_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  balance_diff INTEGER;
  existing_record_id UUID;
BEGIN
  PERFORM set_config('app.bypass_token_protection', 'true', true);

  balance_diff := NEW.tokens_balance - OLD.tokens_balance;

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
$$;
