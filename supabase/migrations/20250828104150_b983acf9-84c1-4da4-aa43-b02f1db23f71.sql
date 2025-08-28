-- Fix security issues and create admin user
-- Fix function search paths
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$function$;

CREATE OR REPLACE FUNCTION public.refund_tokens(user_id_param uuid, tokens_amount integer, reason_text text DEFAULT 'Возврат токенов'::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
    -- Add tokens back to balance
    UPDATE public.profiles
    SET tokens_balance = tokens_balance + tokens_amount,
        updated_at = now()
    WHERE id = user_id_param;
    
    -- Record the transaction
    INSERT INTO public.token_transactions (user_id, amount, transaction_type, description)
    VALUES (user_id_param, tokens_amount, 'refund', reason_text);
    
    RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_payment_success(payment_id_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    payment_record RECORD;
BEGIN
    -- Get payment details
    SELECT * INTO payment_record
    FROM public.payments
    WHERE yookassa_payment_id = payment_id_param
      AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Update payment status
    UPDATE public.payments
    SET status = 'succeeded',
        confirmed_at = now(),
        updated_at = now()
    WHERE yookassa_payment_id = payment_id_param;
    
    -- Add tokens to user balance
    UPDATE public.profiles
    SET tokens_balance = tokens_balance + payment_record.tokens_amount,
        updated_at = now()
    WHERE id = payment_record.user_id;
    
    -- Record token transaction
    INSERT INTO public.token_transactions (user_id, amount, transaction_type, description)
    VALUES (payment_record.user_id, payment_record.tokens_amount, 'purchase', 
            'Пополнение баланса: ' || payment_record.package_name);
    
    RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.spend_tokens(user_id_param uuid, tokens_amount integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    current_balance INTEGER;
BEGIN
    -- Get current token balance
    SELECT tokens_balance INTO current_balance
    FROM public.profiles
    WHERE id = user_id_param;
    
    -- Check if user has enough tokens
    IF current_balance < tokens_amount THEN
        RETURN FALSE;
    END IF;
    
    -- Deduct tokens from balance
    UPDATE public.profiles
    SET tokens_balance = tokens_balance - tokens_amount,
        updated_at = now()
    WHERE id = user_id_param;
    
    -- Record the transaction
    INSERT INTO public.token_transactions (user_id, amount, transaction_type, description)
    VALUES (user_id_param, -tokens_amount, 'generation', 'Токены потрачены на генерацию');
    
    RETURN TRUE;
END;
$function$;

-- Fix payment packages RLS policy to be more restrictive
DROP POLICY IF EXISTS "Everyone can view active packages" ON public.payment_packages;
CREATE POLICY "Authenticated users can view active packages" 
ON public.payment_packages 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- Create admin user (manual insert)
-- Email: admin@wbgenerator.com
-- Password: WBGen2024!@#$Admin
-- This will be inserted manually after migration approval