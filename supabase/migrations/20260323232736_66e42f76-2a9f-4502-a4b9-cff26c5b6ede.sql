-- 1. Change default commission rate to 15%
ALTER TABLE public.partner_profiles ALTER COLUMN commission_rate SET DEFAULT 15;

-- 2. Create function to update profile on login (updates updated_at and login_count)
CREATE OR REPLACE FUNCTION public.update_profile_on_login(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE profiles
  SET updated_at = now(),
      login_count = login_count + 1
  WHERE id = user_id_param;
END;
$$;

-- 3. Update process_partner_commission to check 1-year expiry
CREATE OR REPLACE FUNCTION public.process_partner_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_partner_id uuid;
  v_referral_id uuid;
  v_commission_rate integer;
  v_commission_amount numeric;
  v_referral_registered_at timestamptz;
BEGIN
  IF NEW.status = 'succeeded' AND (OLD.status IS NULL OR OLD.status != 'succeeded') THEN
    SELECT pr.id, pr.partner_id, pp.commission_rate, pr.registered_at
    INTO v_referral_id, v_partner_id, v_commission_rate, v_referral_registered_at
    FROM partner_referrals pr
    JOIN partner_profiles pp ON pp.id = pr.partner_id
    WHERE pr.referred_user_id = NEW.user_id
    AND pp.status IN ('active', 'inactive')
    LIMIT 1;
    
    IF v_partner_id IS NOT NULL AND v_referral_registered_at IS NOT NULL 
       AND v_referral_registered_at > (now() - interval '1 year') THEN
      v_commission_amount := NEW.amount * v_commission_rate / 100;
      
      INSERT INTO partner_commissions (
        partner_id, referral_id, payment_id,
        commission_amount, commission_rate, payment_amount, status
      ) VALUES (
        v_partner_id, v_referral_id, NEW.id,
        v_commission_amount, v_commission_rate, NEW.amount, 'pending'
      );
      
      UPDATE partner_profiles
      SET total_earned = total_earned + v_commission_amount,
          current_balance = current_balance + v_commission_amount,
          status = 'active', updated_at = now()
      WHERE id = v_partner_id;
      
      UPDATE partner_referrals
      SET total_payments = total_payments + NEW.amount,
          total_commission = total_commission + v_commission_amount,
          first_payment_at = COALESCE(first_payment_at, now()),
          status = 'active'
      WHERE id = v_referral_id;
      
      PERFORM log_security_event(
        NEW.user_id, 'partner_commission_created',
        'Partner commission created for payment', NULL, NULL,
        jsonb_build_object('partner_id', v_partner_id, 'commission_amount', v_commission_amount, 'payment_id', NEW.id)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;