-- Update handle_new_user function to add better logging and fix referral logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    ref_code TEXT;
    referrer_user_id UUID;
    referral_code_from_meta TEXT;
BEGIN
    -- Generate unique referral code
    LOOP
        ref_code := generate_referral_code();
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = ref_code);
    END LOOP;

    -- Get referral code from metadata with detailed logging
    referral_code_from_meta := NEW.raw_user_meta_data->>'referral_code';
    
    -- Log the signup attempt for debugging
    PERFORM public.log_security_event(
        NEW.id,
        'user_signup',
        'User signup attempt with metadata',
        NULL,
        NULL,
        jsonb_build_object(
            'email', NEW.email,
            'has_referral_code', (referral_code_from_meta IS NOT NULL),
            'referral_code_value', referral_code_from_meta,
            'raw_meta_data', NEW.raw_user_meta_data
        )
    );

    -- Check if user was referred (get from metadata)
    IF referral_code_from_meta IS NOT NULL AND referral_code_from_meta != '' THEN
        -- Find referrer by referral code
        SELECT id INTO referrer_user_id 
        FROM public.profiles 
        WHERE referral_code = referral_code_from_meta;
        
        IF referrer_user_id IS NOT NULL THEN
            -- Insert profile with starter tokens + referral bonus (35 total)
            INSERT INTO public.profiles (id, email, referral_code, tokens_balance, referred_by)
            VALUES (NEW.id, NEW.email, ref_code, 35, referrer_user_id);
            
            -- Add token transactions for new user
            INSERT INTO public.token_transactions (user_id, amount, transaction_type, description)
            VALUES 
                (NEW.id, 25, 'bonus', 'Стартовые токены при регистрации'),
                (NEW.id, 10, 'referral_bonus', 'Бонус за регистрацию по реферальной ссылке');
            
            -- Create referral record
            INSERT INTO public.referrals (referrer_id, referred_id, status)
            VALUES (referrer_user_id, NEW.id, 'pending');

            -- Log successful referral
            PERFORM public.log_security_event(
                NEW.id,
                'referral_signup_success',
                'User signed up with valid referral code',
                NULL,
                NULL,
                jsonb_build_object(
                    'referrer_id', referrer_user_id,
                    'referral_code', referral_code_from_meta,
                    'tokens_awarded', 35
                )
            );
        ELSE
            -- No valid referrer found, just starter tokens
            INSERT INTO public.profiles (id, email, referral_code, tokens_balance)
            VALUES (NEW.id, NEW.email, ref_code, 25);
            
            INSERT INTO public.token_transactions (user_id, amount, transaction_type, description)
            VALUES (NEW.id, 25, 'bonus', 'Стартовые токены при регистрации');

            -- Log invalid referral code
            PERFORM public.log_security_event(
                NEW.id,
                'referral_signup_invalid',
                'User used invalid referral code during signup',
                NULL,
                NULL,
                jsonb_build_object(
                    'referral_code', referral_code_from_meta,
                    'tokens_awarded', 25
                )
            );
        END IF;
    ELSE
        -- No referral, just starter tokens
        INSERT INTO public.profiles (id, email, referral_code, tokens_balance)
        VALUES (NEW.id, NEW.email, ref_code, 25);
        
        INSERT INTO public.token_transactions (user_id, amount, transaction_type, description)
        VALUES (NEW.id, 25, 'bonus', 'Стартовые токены при регистрации');

        -- Log normal signup
        PERFORM public.log_security_event(
            NEW.id,
            'normal_signup',
            'User signed up without referral code',
            NULL,
            NULL,
            jsonb_build_object(
                'tokens_awarded', 25
            )
        );
    END IF;

    -- Assign default 'user' role to new user
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user'::app_role);

    RETURN NEW;
END;
$$;