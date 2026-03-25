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
    signup_utm_source_id UUID;
BEGIN
    -- Generate unique referral code
    ref_code := generate_referral_code();
    
    -- Get referral code from metadata
    signup_referral_code := NEW.raw_user_meta_data ->> 'referral_code';
    signup_partner_code := NEW.raw_user_meta_data ->> 'partner_code';
    signup_utm_source_id := NULLIF(NEW.raw_user_meta_data ->> 'utm_source_id', '')::UUID;
    
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

    -- Create profile
    IF referrer_user_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, email, referral_code, tokens_balance, referred_by, utm_source_id)
        VALUES (NEW.id, NEW.email, ref_code, 0, referrer_user_id, signup_utm_source_id);
            
        INSERT INTO public.referrals (referrer_id, referred_id, status)
        VALUES (referrer_user_id, NEW.id, 'pending')
        ON CONFLICT DO NOTHING;
    ELSE
        IF signup_referral_code IS NOT NULL THEN
            INSERT INTO public.profiles (id, email, referral_code, tokens_balance, utm_source_id)
            VALUES (NEW.id, NEW.email, ref_code, 0, signup_utm_source_id);

            INSERT INTO public.security_events (user_id, event_type, event_description, metadata)
            VALUES (NEW.id, 'invalid_referral_code', 'Попытка регистрации с несуществующим реферальным кодом', 
                jsonb_build_object('referral_code', signup_referral_code));
        ELSE
            INSERT INTO public.profiles (id, email, referral_code, tokens_balance, utm_source_id)
            VALUES (NEW.id, NEW.email, ref_code, 0, signup_utm_source_id);
        END IF;
    END IF;

    -- Assign default 'user' role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user'::app_role);

    RETURN NEW;
END;
$$;