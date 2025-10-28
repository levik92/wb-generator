-- Функция для применения комиссий к существующим успешным платежам
CREATE OR REPLACE FUNCTION apply_partner_commissions_to_existing_payments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment_record RECORD;
  v_partner_id uuid;
  v_referral_id uuid;
  v_commission_rate integer;
  v_commission_amount numeric;
BEGIN
  -- Перебираем все успешные платежи от рефералов без комиссий
  FOR payment_record IN 
    SELECT p.id, p.user_id, p.amount
    FROM payments p
    JOIN partner_referrals pr ON pr.referred_user_id = p.user_id
    WHERE p.status = 'succeeded'
    AND NOT EXISTS (
      SELECT 1 FROM partner_commissions pc WHERE pc.payment_id = p.id
    )
  LOOP
    -- Находим партнера для этого реферала
    SELECT pr.id, pr.partner_id, pp.commission_rate
    INTO v_referral_id, v_partner_id, v_commission_rate
    FROM partner_referrals pr
    JOIN partner_profiles pp ON pp.id = pr.partner_id
    WHERE pr.referred_user_id = payment_record.user_id
    AND pp.status IN ('active', 'inactive')
    LIMIT 1;
    
    IF v_partner_id IS NOT NULL THEN
      -- Рассчитываем комиссию
      v_commission_amount := payment_record.amount * v_commission_rate / 100;
      
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
        payment_record.id,
        v_commission_amount,
        v_commission_rate,
        payment_record.amount,
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
        total_payments = total_payments + payment_record.amount,
        total_commission = total_commission + v_commission_amount,
        first_payment_at = COALESCE(first_payment_at, now()),
        status = 'active'
      WHERE id = v_referral_id;
    END IF;
  END LOOP;
END;
$$;

-- Применяем комиссии к существующим платежам
SELECT apply_partner_commissions_to_existing_payments();