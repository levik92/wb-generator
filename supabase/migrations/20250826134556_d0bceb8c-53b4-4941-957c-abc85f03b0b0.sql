-- Function to refund tokens to user
CREATE OR REPLACE FUNCTION public.refund_tokens(user_id_param uuid, tokens_amount integer, reason_text text DEFAULT 'Возврат токенов')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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