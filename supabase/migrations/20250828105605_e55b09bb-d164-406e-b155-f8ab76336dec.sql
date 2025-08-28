-- Update admin email to admin@wbgen.ru
-- Remove the placeholder package info
DELETE FROM public.payment_packages WHERE name = 'Admin Setup Info';

-- Create admin user with new email
-- This will be used to create the admin account
INSERT INTO public.profiles (id, email, tokens_balance, created_at, updated_at, referral_code)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'admin@wbgen.ru', 1000000, now(), now(), 'ADMIN001')
ON CONFLICT (id) DO UPDATE SET 
  email = 'admin@wbgen.ru',
  updated_at = now();

-- Assign admin role
INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'admin', now(), now())
ON CONFLICT (user_id, role) DO NOTHING;