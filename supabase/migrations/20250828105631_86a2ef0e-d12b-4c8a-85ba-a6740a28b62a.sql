-- Simple migration to clean up
-- Remove the placeholder package info if exists
DELETE FROM public.payment_packages WHERE name = 'Admin Setup Info';

-- Note: Admin user admin@wbgen.ru with password WBGen2024!@#$Admin needs to be manually registered
-- After registration, assign admin role with:
-- INSERT INTO public.user_roles (user_id, role) VALUES ([admin_user_id], 'admin');