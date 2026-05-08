DO $$
DECLARE
  rec RECORD;
BEGIN
  PERFORM set_config('app.bypass_token_protection', 'true', true);

  FOR rec IN
    SELECT p.id AS payment_id, p.user_id, p.tokens_amount, p.package_name, p.confirmed_at
    FROM public.payments p
    WHERE p.payment_provider = 'cloudpayments'
      AND p.status = 'succeeded'
      AND p.tokens_amount > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.token_transactions tt
        WHERE tt.user_id = p.user_id
          AND tt.transaction_type = 'purchase'
          AND tt.amount = p.tokens_amount
          AND tt.description = 'Пополнение баланса: ' || p.package_name
          AND tt.created_at BETWEEN COALESCE(p.confirmed_at, p.created_at) - interval '30 minutes'
                                AND COALESCE(p.confirmed_at, p.created_at) + interval '30 minutes'
      )
  LOOP
    UPDATE public.profiles
    SET tokens_balance = tokens_balance + rec.tokens_amount,
        updated_at = now()
    WHERE id = rec.user_id;

    INSERT INTO public.token_transactions (user_id, amount, transaction_type, description)
    VALUES (rec.user_id, rec.tokens_amount, 'purchase',
            'Пополнение баланса: ' || rec.package_name);

    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (rec.user_id, 'Оплата прошла успешно',
            'Начислено ' || rec.tokens_amount || ' токенов (' || rec.package_name || ')',
            'payment_confirmed');
  END LOOP;
END $$;