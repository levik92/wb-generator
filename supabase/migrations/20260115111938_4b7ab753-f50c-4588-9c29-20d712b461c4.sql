-- Изменить стартовые токены при регистрации с 10 на 0
-- и бонус за реферала с 20 на 10 (только реферальный бонус остается)

-- Изменить дефолтное значение в таблице profiles
ALTER TABLE public.profiles ALTER COLUMN tokens_balance SET DEFAULT 0;

-- Обновить функцию handle_new_user для начисления 0 токенов при обычной регистрации
-- и 10 токенов (только реферальный бонус) при регистрации по реферальной ссылке
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

    -- Create profile and handle referral bonus
    IF referrer_user_id IS NOT NULL THEN
        -- Insert profile with referral bonus only (10 tokens)
        INSERT INTO public.profiles (id, email, referral_code, tokens_balance, referred_by)
        VALUES (NEW.id, NEW.email, ref_code, 10, referrer_user_id);
        
        -- Add token transaction for referral bonus only
        INSERT INTO public.token_transactions (user_id, amount, transaction_type, description)
        VALUES (NEW.id, 10, 'referral_bonus', 'Бонус за регистрацию по реферальной ссылке');
            
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