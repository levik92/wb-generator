-- Create admin user manually
-- First, we need to insert the user into auth.users and then create the profile and role
-- Note: This is a placeholder - the actual admin user needs to be created through the auth system
-- We'll create the role assignment for when the admin user signs up

-- Insert a placeholder to show the admin email that should be used
INSERT INTO public.payment_packages (name, price, tokens, currency, is_active) 
VALUES 
  ('Admin Setup Info', 0, 0, 'INFO', false)
ON CONFLICT DO NOTHING;

-- We'll manually assign admin role after the user signs up with email: admin@wbgenerator.com
-- Password should be: WBGen2024!@#$Admin