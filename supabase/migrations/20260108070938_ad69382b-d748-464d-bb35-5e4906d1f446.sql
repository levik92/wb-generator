-- Update the handle_new_user function to give 10 tokens instead of 20
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    ref_code TEXT;
    referrer_user_id UUID;
    referral_code_from_meta TEXT;
    partner_code_from_meta TEXT;
    partner_profile_id UUID;
BEGIN
    -- Generate unique referral code
    LOOP
        ref_code := generate_referral_code();
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = ref_code);
    END LOOP;

    -- Get referral and partner codes from metadata
    referral_code_from_meta := NEW.raw_user_meta_data->>'referral_code';
    partner_code_from_meta := NEW.raw_user_meta_data->>'partner_code';
    
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
            'has_partner_code', (partner_code_from_meta IS NOT NULL),
            'partner_code_value', partner_code_from_meta,
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
            -- Insert profile with starter tokens + referral bonus (20 total: 10 base + 10 referral)
            INSERT INTO public.profiles (id, email, referral_code, tokens_balance, referred_by)
            VALUES (NEW.id, NEW.email, ref_code, 20, referrer_user_id);
            
            -- Add token transactions for new user
            INSERT INTO public.token_transactions (user_id, amount, transaction_type, description)
            VALUES 
                (NEW.id, 10, 'bonus', 'Стартовые токены при регистрации'),
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
                    'tokens_awarded', 20
                )
            );
        ELSE
            -- No valid referrer found, just starter tokens (10)
            INSERT INTO public.profiles (id, email, referral_code, tokens_balance)
            VALUES (NEW.id, NEW.email, ref_code, 10);
            
            INSERT INTO public.token_transactions (user_id, amount, transaction_type, description)
            VALUES (NEW.id, 10, 'bonus', 'Стартовые токены при регистрации');

            -- Log invalid referral code
            PERFORM public.log_security_event(
                NEW.id,
                'referral_signup_invalid',
                'User used invalid referral code during signup',
                NULL,
                NULL,
                jsonb_build_object(
                    'referral_code', referral_code_from_meta,
                    'tokens_awarded', 10
                )
            );
        END IF;
    ELSE
        -- No referral, just starter tokens (10)
        INSERT INTO public.profiles (id, email, referral_code, tokens_balance)
        VALUES (NEW.id, NEW.email, ref_code, 10);
        
        INSERT INTO public.token_transactions (user_id, amount, transaction_type, description)
        VALUES (NEW.id, 10, 'bonus', 'Стартовые токены при регистрации');

        -- Log normal signup
        PERFORM public.log_security_event(
            NEW.id,
            'normal_signup',
            'User signed up without referral code',
            NULL,
            NULL,
            jsonb_build_object(
                'tokens_awarded', 10
            )
        );
    END IF;

    -- Process partner code if present
    IF partner_code_from_meta IS NOT NULL AND partner_code_from_meta != '' THEN
        SELECT id INTO partner_profile_id
        FROM public.partner_profiles
        WHERE partner_code = partner_code_from_meta
        AND status = 'active';
        
        IF partner_profile_id IS NOT NULL THEN
            INSERT INTO public.partner_referrals (partner_id, referred_user_id, status)
            VALUES (partner_profile_id, NEW.id, 'registered');
            
            UPDATE public.partner_profiles
            SET invited_clients_count = invited_clients_count + 1
            WHERE id = partner_profile_id;
            
            PERFORM public.log_security_event(
                NEW.id,
                'partner_referral_success',
                'User signed up with partner code',
                NULL,
                NULL,
                jsonb_build_object(
                    'partner_id', partner_profile_id,
                    'partner_code', partner_code_from_meta
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;