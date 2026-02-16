
-- Drop old use_promocode and recreate with correct return type
DROP FUNCTION IF EXISTS public.use_promocode(text);

CREATE OR REPLACE FUNCTION public.use_promocode(code_param TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    promocode_record RECORD;
BEGIN
    PERFORM set_config('app.bypass_token_protection', 'true', true);
    
    SELECT * INTO promocode_record
    FROM promocodes
    WHERE code = code_param
      AND is_active = true
      AND (valid_from IS NULL OR valid_from <= now())
      AND (valid_until IS NULL OR valid_until >= now())
      AND (max_uses IS NULL OR current_uses < max_uses)
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired promocode');
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM promocode_uses 
        WHERE promocode_id = promocode_record.id 
          AND user_id = auth.uid()
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Promocode already used');
    END IF;
    
    UPDATE promocodes 
    SET current_uses = current_uses + 1,
        updated_at = now()
    WHERE id = promocode_record.id;
    
    INSERT INTO promocode_uses (promocode_id, user_id)
    VALUES (promocode_record.id, auth.uid());
    
    IF promocode_record.type = 'tokens' THEN
        UPDATE profiles
        SET tokens_balance = tokens_balance + promocode_record.value,
            updated_at = now()
        WHERE id = auth.uid();
        
        INSERT INTO token_transactions (user_id, amount, transaction_type, description)
        VALUES (auth.uid(), promocode_record.value, 'promocode', 'Промокод: ' || code_param);
    END IF;
    
    PERFORM log_security_event(
        auth.uid(),
        'promocode_used',
        'User used promocode: ' || code_param,
        NULL,
        NULL,
        jsonb_build_object('promocode', code_param, 'value', promocode_record.value, 'type', promocode_record.type)
    );
    
    RETURN jsonb_build_object(
        'success', true, 
        'type', promocode_record.type,
        'value', promocode_record.value
    );
END;
$$;
