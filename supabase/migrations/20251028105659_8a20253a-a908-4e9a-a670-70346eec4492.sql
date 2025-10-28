-- Добавляем RLS политики для service role на таблицы партнерской программы

-- Политики для partner_profiles (UPDATE для service role)
CREATE POLICY "Service can update partner profiles"
ON partner_profiles
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Политики для partner_referrals (UPDATE для service role)
CREATE POLICY "Service can update referrals"
ON partner_referrals
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Политики для partner_commissions (UPDATE для service role)
CREATE POLICY "Service can update commissions"
ON partner_commissions
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Исправляем функцию process_partner_commission для корректной работы
CREATE OR REPLACE FUNCTION public.process_partner_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_partner_id uuid;
  v_referral_id uuid;
  v_commission_rate integer;
  v_commission_amount numeric;
BEGIN
  -- Проверяем, что платеж успешен
  IF NEW.status = 'succeeded' AND (OLD.status IS NULL OR OLD.status != 'succeeded') THEN
    -- Находим партнерского реферала
    SELECT pr.id, pr.partner_id, pp.commission_rate
    INTO v_referral_id, v_partner_id, v_commission_rate
    FROM partner_referrals pr
    JOIN partner_profiles pp ON pp.id = pr.partner_id
    WHERE pr.referred_user_id = NEW.user_id
    AND pp.status IN ('active', 'inactive')
    LIMIT 1;
    
    -- Если есть партнер
    IF v_partner_id IS NOT NULL THEN
      -- Рассчитываем комиссию
      v_commission_amount := NEW.amount * v_commission_rate / 100;
      
      -- Создаем запись о комиссии
      INSERT INTO partner_commissions (
        partner_id,
        referral_id,
        payment_id,
        commission_amount,
        commission_rate,
        payment_amount,
        status
      ) VALUES (
        v_partner_id,
        v_referral_id,
        NEW.id,
        v_commission_amount,
        v_commission_rate,
        NEW.amount,
        'pending'
      );
      
      -- Обновляем статистику партнера
      UPDATE partner_profiles
      SET 
        total_earned = total_earned + v_commission_amount,
        current_balance = current_balance + v_commission_amount,
        status = 'active',
        updated_at = now()
      WHERE id = v_partner_id;
      
      -- Обновляем статистику реферала
      UPDATE partner_referrals
      SET 
        total_payments = total_payments + NEW.amount,
        total_commission = total_commission + v_commission_amount,
        first_payment_at = COALESCE(first_payment_at, now()),
        status = 'active'
      WHERE id = v_referral_id;
      
      -- Логируем событие
      PERFORM log_security_event(
        NEW.user_id,
        'partner_commission_created',
        'Partner commission created for payment',
        NULL,
        NULL,
        jsonb_build_object(
          'partner_id', v_partner_id,
          'commission_amount', v_commission_amount,
          'payment_id', NEW.id
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;