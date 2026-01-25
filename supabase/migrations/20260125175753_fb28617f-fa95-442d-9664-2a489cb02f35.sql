-- Обновляем handle_new_user: убираем начисление токенов при регистрации по реферальной ссылке
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    referrer_user_id UUID;
    partner_user_id UUID;
    ref_code TEXT;
    signup_referral_code TEXT;
    signup_partner_code TEXT;
BEGIN
    -- Generate unique referral code
    ref_code := generate_referral_code();
    
    -- Get referral code from metadata
    signup_referral_code := NEW.raw_user_meta_data ->> 'referral_code';
    signup_partner_code := NEW.raw_user_meta_data ->> 'partner_code';
    
    -- If referral code provided, find referrer
    IF signup_referral_code IS NOT NULL THEN
        SELECT id INTO referrer_user_id 
        FROM public.profiles 
        WHERE referral_code = signup_referral_code;
    END IF;
    
    -- Process partner signup if partner code provided
    IF signup_partner_code IS NOT NULL THEN
        BEGIN
            PERFORM process_partner_signup(NEW.id, signup_partner_code);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    -- Create profile (NO tokens on registration anymore - tokens only after first payment)
    IF referrer_user_id IS NOT NULL THEN
        -- Insert profile with 0 tokens, but save referrer
        INSERT INTO public.profiles (id, email, referral_code, tokens_balance, referred_by)
        VALUES (NEW.id, NEW.email, ref_code, 0, referrer_user_id);
            
        -- Create pending referral record
        INSERT INTO public.referrals (referrer_id, referred_id, status)
        VALUES (referrer_user_id, NEW.id, 'pending')
        ON CONFLICT DO NOTHING;
    ELSE
        -- Check if referral code was provided but not found
        IF signup_referral_code IS NOT NULL THEN
            -- No valid referrer found, 0 starter tokens
            INSERT INTO public.profiles (id, email, referral_code, tokens_balance)
            VALUES (NEW.id, NEW.email, ref_code, 0);

            -- Log invalid referral code
            INSERT INTO public.security_events (user_id, event_type, event_description, metadata)
            VALUES (NEW.id, 'invalid_referral_code', 'Попытка регистрации с несуществующим реферальным кодом', 
                jsonb_build_object('referral_code', signup_referral_code));
        ELSE
            -- No referral code, just 0 starter tokens
            INSERT INTO public.profiles (id, email, referral_code, tokens_balance)
            VALUES (NEW.id, NEW.email, ref_code, 0);
        END IF;
    END IF;

    -- Assign default 'user' role to new user
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user'::app_role);

    RETURN NEW;
END;
$$;

-- Обновляем process_referral_bonus_on_payment: начисляем по 15 токенов обоим после первой оплаты
CREATE OR REPLACE FUNCTION public.process_referral_bonus_on_payment()
RETURNS TRIGGER AS $$
DECLARE
    referrer_user_id UUID;
BEGIN
    -- Only process if payment is successful and user hasn't received referral bonus yet
    IF NEW.status = 'succeeded' AND OLD.status = 'pending' THEN
        -- Check if this user was referred and hasn't received bonus yet
        SELECT r.referrer_id INTO referrer_user_id
        FROM public.referrals r
        WHERE r.referred_id = NEW.user_id 
          AND r.status = 'pending'
          AND NOT EXISTS (
            SELECT 1 FROM public.referrals_completed rc 
            WHERE rc.referred_id = NEW.user_id
          );
        
        IF referrer_user_id IS NOT NULL THEN
            -- Award 15 tokens to referrer
            UPDATE public.profiles
            SET tokens_balance = tokens_balance + 15,
                updated_at = now()
            WHERE id = referrer_user_id;
            
            -- Record the transaction for referrer
            INSERT INTO public.token_transactions (user_id, amount, transaction_type, description)
            VALUES (referrer_user_id, 15, 'referral_bonus', 'Бонус за приведенного друга');
            
            -- Award 15 tokens to referred user (the one who made payment)
            UPDATE public.profiles
            SET tokens_balance = tokens_balance + 15,
                updated_at = now()
            WHERE id = NEW.user_id;
            
            -- Record the transaction for referred user
            INSERT INTO public.token_transactions (user_id, amount, transaction_type, description)
            VALUES (NEW.user_id, 15, 'referral_bonus', 'Бонус за первую оплату по реферальной ссылке');
            
            -- Mark referral as completed
            UPDATE public.referrals
            SET status = 'completed',
                tokens_awarded = 15
            WHERE referrer_id = referrer_user_id AND referred_id = NEW.user_id;
            
            -- Record completed referral (now both get 15 tokens each)
            INSERT INTO public.referrals_completed (referrer_id, referred_id, payment_id, tokens_awarded)
            VALUES (referrer_user_id, NEW.user_id, NEW.id, 15);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;