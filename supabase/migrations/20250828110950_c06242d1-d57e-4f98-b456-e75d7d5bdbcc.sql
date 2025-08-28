-- Create admin user and update payment packages

-- Insert admin user data (user needs to register with levic.vlad@mail.ru first)
-- This is a placeholder to remind about admin setup
INSERT INTO public.payment_packages (name, price, tokens, currency, is_active) VALUES 
('Admin Setup Reminder', 0, 0, 'RUB', false);

-- Update payment packages with new tariffs
DELETE FROM public.payment_packages WHERE is_active = true;

INSERT INTO public.payment_packages (name, price, tokens, currency, is_active) VALUES 
('Стартовый', 499, 40, 'RUB', true),
('Профи', 1499, 130, 'RUB', true),  
('Бизнес', 5999, 550, 'RUB', true);

-- Note: Admin user levic.vlad@mail.ru needs to be manually registered
-- After registration, assign admin role with:
-- INSERT INTO public.user_roles (user_id, role) 
-- SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'levic.vlad@mail.ru';