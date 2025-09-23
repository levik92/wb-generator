-- Fix audit_logs admin_user_id constraint issue for system operations
-- Make admin_user_id nullable for system operations like payment processing
ALTER TABLE public.audit_logs ALTER COLUMN admin_user_id DROP NOT NULL;

-- Update audit_payment_changes function to handle system operations properly
CREATE OR REPLACE FUNCTION public.audit_payment_changes()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- For payment creation, this is typically a system operation
        PERFORM public.log_audit_event(
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), -- Use system UUID for system operations
            'payment_created',
            'payments',
            NEW.id::text,
            NULL,
            jsonb_build_object('user_id', NEW.user_id, 'amount', NEW.amount, 'package_name', NEW.package_name)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- For payment updates, this could be system or admin operation
        PERFORM public.log_audit_event(
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), -- Use system UUID for system operations
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