
-- Fix 1: Add notifications to 1-param process_payment_success (YooKassa version)
CREATE OR REPLACE FUNCTION public.process_payment_success(payment_id_param text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

    -- Fix: Add notification (was missing in YooKassa version)
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (payment_record.user_id, 'Оплата прошла успешно',
            'Начислено ' || payment_record.tokens_amount || ' токенов (' || payment_record.package_name || ')',
            'success');

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
$function$;

-- Fix 2: Add 'expired' to user select policy
DROP POLICY IF EXISTS secure_payments_user_select ON payments;
CREATE POLICY secure_payments_user_select ON payments
  FOR SELECT TO public
  USING (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
    AND status = ANY (ARRAY['pending', 'succeeded', 'failed', 'canceled', 'expired'])
    AND created_at > (now() - interval '1 year')
  );

-- Fix 3: Allow external_payment_id as alternative to yookassa_payment_id in insert
DROP POLICY IF EXISTS secure_payments_webhook_insert ON payments;
CREATE POLICY secure_payments_webhook_insert ON payments
  FOR INSERT TO public
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'service_role'
    AND user_id IS NOT NULL
    AND package_name IS NOT NULL
    AND amount > 0
    AND tokens_amount > 0
    AND (yookassa_payment_id IS NOT NULL OR external_payment_id IS NOT NULL)
    AND status = 'pending'
  );
