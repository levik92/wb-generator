-- Fix security warnings by properly dropping and recreating functions with search_path

-- Drop trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Now we can drop and recreate the function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate functions with proper search_path
CREATE OR REPLACE FUNCTION generate_referral_code() RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    code TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        code := code || substring(chars FROM (random() * length(chars))::integer + 1 FOR 1);
    END LOOP;
    RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
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

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();