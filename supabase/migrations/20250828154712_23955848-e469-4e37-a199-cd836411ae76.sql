-- Update referral system: Only award bonus after first confirmed payment
-- Add new referrals_completed table to track completed referrals
CREATE TABLE IF NOT EXISTS public.referrals_completed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  tokens_awarded INTEGER NOT NULL DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(referred_id) -- One bonus per referred user
);

-- Enable RLS
ALTER TABLE public.referrals_completed ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own completed referrals" 
ON public.referrals_completed
FOR SELECT 
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "System can insert completed referrals" 
ON public.referrals_completed
FOR INSERT 
WITH CHECK (true);

-- Update handle_new_user function to give referral bonus immediately
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    ref_code TEXT;
    referrer_user_id UUID;
BEGIN
    -- Generate unique referral code
    LOOP
        ref_code := generate_referral_code();
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = ref_code);
    END LOOP;

    -- Check if user was referred (get from metadata)
    IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
        -- Find referrer by referral code
        SELECT id INTO referrer_user_id 
        FROM public.profiles 
        WHERE referral_code = NEW.raw_user_meta_data->>'referral_code';
        
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
        ELSE
            -- No valid referrer found, just starter tokens
            INSERT INTO public.profiles (id, email, referral_code, tokens_balance)
            VALUES (NEW.id, NEW.email, ref_code, 25);
            
            INSERT INTO public.token_transactions (user_id, amount, transaction_type, description)
            VALUES (NEW.id, 25, 'bonus', 'Стартовые токены при регистрации');
        END IF;
    ELSE
        -- No referral, just starter tokens
        INSERT INTO public.profiles (id, email, referral_code, tokens_balance)
        VALUES (NEW.id, NEW.email, ref_code, 25);
        
        INSERT INTO public.token_transactions (user_id, amount, transaction_type, description)
        VALUES (NEW.id, 25, 'bonus', 'Стартовые токены при регистрации');
    END IF;

    -- Assign default 'user' role to new user
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user'::app_role);

    RETURN NEW;
END;
$$;

-- Create function to process referral bonus on first payment
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
            -- Award 20 tokens to referrer
            UPDATE public.profiles
            SET tokens_balance = tokens_balance + 20,
                updated_at = now()
            WHERE id = referrer_user_id;
            
            -- Record the transaction for referrer
            INSERT INTO public.token_transactions (user_id, amount, transaction_type, description)
            VALUES (referrer_user_id, 20, 'referral_bonus', 'Бонус за приведенного друга');
            
            -- Mark referral as completed
            UPDATE public.referrals
            SET status = 'completed'
            WHERE referrer_id = referrer_user_id AND referred_id = NEW.user_id;
            
            -- Record completed referral
            INSERT INTO public.referrals_completed (referrer_id, referred_id, payment_id, tokens_awarded)
            VALUES (referrer_user_id, NEW.user_id, NEW.id, 20);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for referral bonus on payment success
DROP TRIGGER IF EXISTS referral_bonus_on_payment ON public.payments;
CREATE TRIGGER referral_bonus_on_payment
    AFTER UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.process_referral_bonus_on_payment();