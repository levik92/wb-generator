-- Update generations table to store generation data properly
ALTER TABLE public.generations 
ADD COLUMN IF NOT EXISTS product_name TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS keywords TEXT[],
ADD COLUMN IF NOT EXISTS competitors TEXT[],
ADD COLUMN IF NOT EXISTS description_requirements TEXT;

-- Create edge function to handle token spending
CREATE OR REPLACE FUNCTION public.spend_tokens(user_id_param UUID, tokens_amount INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;