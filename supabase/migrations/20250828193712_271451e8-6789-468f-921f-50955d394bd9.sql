-- Create security events table for tracking security-related activities
CREATE TABLE public.security_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    event_type TEXT NOT NULL,
    event_description TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit logs table for tracking admin actions
CREATE TABLE public.audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID NOT NULL REFERENCES auth.users(id),
    action_type TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for security_events (only accessible by admins and service role)
CREATE POLICY "Admins can read all security events" 
ON public.security_events 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Create policies for audit_logs (only accessible by admins)
CREATE POLICY "Admins can read audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Create indexes for better performance
CREATE INDEX idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX idx_security_events_event_type ON public.security_events(event_type);
CREATE INDEX idx_security_events_created_at ON public.security_events(created_at DESC);
CREATE INDEX idx_audit_logs_admin_user_id ON public.audit_logs(admin_user_id);
CREATE INDEX idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
    user_id_param UUID,
    event_type_param TEXT,
    event_description_param TEXT,
    ip_address_param INET DEFAULT NULL,
    user_agent_param TEXT DEFAULT NULL,
    metadata_param JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO public.security_events (
        user_id, 
        event_type, 
        event_description, 
        ip_address, 
        user_agent, 
        metadata
    )
    VALUES (
        user_id_param, 
        event_type_param, 
        event_description_param, 
        ip_address_param, 
        user_agent_param, 
        metadata_param
    )
    RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$function$;

-- Create function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
    admin_user_id_param UUID,
    action_type_param TEXT,
    resource_type_param TEXT,
    resource_id_param TEXT DEFAULT NULL,
    old_values_param JSONB DEFAULT NULL,
    new_values_param JSONB DEFAULT NULL,
    ip_address_param INET DEFAULT NULL,
    user_agent_param TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        admin_user_id,
        action_type,
        resource_type,
        resource_id,
        old_values,
        new_values,
        ip_address,
        user_agent
    )
    VALUES (
        admin_user_id_param,
        action_type_param,
        resource_type_param,
        resource_id_param,
        old_values_param,
        new_values_param,
        ip_address_param,
        user_agent_param
    )
    RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$function$;