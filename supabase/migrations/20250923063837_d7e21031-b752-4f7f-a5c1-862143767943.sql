-- Use NULL for system operations in audit logs to avoid FK violations
CREATE OR REPLACE FUNCTION public.audit_payment_changes()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.log_audit_event(
            NULL, -- system operation: do not attach to a specific admin user
            'payment_created',
            'payments',
            NEW.id::text,
            NULL,
            jsonb_build_object('user_id', NEW.user_id, 'amount', NEW.amount, 'package_name', NEW.package_name)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.log_audit_event(
            NULL, -- system operation
            'payment_updated',
            'payments',
            NEW.id::text,
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status)
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$function$;