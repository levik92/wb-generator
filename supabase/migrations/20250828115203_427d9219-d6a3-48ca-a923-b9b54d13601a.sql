-- Update the handle_new_user function to assign 'user' role by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    ref_code TEXT;
BEGIN
    -- Generate unique referral code
    LOOP
        ref_code := generate_referral_code();
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = ref_code);
    END LOOP;

    -- Insert profile with starter tokens
    INSERT INTO public.profiles (id, email, referral_code, tokens_balance)
    VALUES (NEW.id, NEW.email, ref_code, 25);

    -- Add initial token transaction
    INSERT INTO public.token_transactions (user_id, amount, transaction_type, description)
    VALUES (NEW.id, 25, 'bonus', 'Стартовые токены при регистрации');

    -- Assign default 'user' role to new user
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user'::app_role);

    RETURN NEW;
END;
$function$