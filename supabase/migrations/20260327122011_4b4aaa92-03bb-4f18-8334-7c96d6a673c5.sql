CREATE OR REPLACE FUNCTION public.process_payment_success(
  payment_id_param text,
  external_id_param text DEFAULT NULL
)
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

    IF external_id_param IS NOT NULL THEN
        SELECT * INTO payment_record
        FROM public.payments
        WHERE external_payment_id = external_id_param
          AND status = 'pending';
    ELSE
        SELECT * INTO payment_record
        FROM public.payments
        WHERE yookassa_payment_id = payment_id_param
          AND status = 'pending';
    END IF;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    UPDATE public.payments
    SET status = 'succeeded',
        confirmed_at = now(),
        updated_at = now()
    WHERE id = payment_record.id;

    UPDATE public.profiles
    SET tokens_balance = tokens_balance + payment_record.tokens_amount,
        updated_at = now()
    WHERE id = payment_record.user_id;

    INSERT INTO public.token_transactions (user_id, amount, transaction_type, description)
    VALUES (payment_record.user_id, payment_record.tokens_amount, 'purchase',
            'Пополнение баланса: ' || payment_record.package_name);

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
$$;