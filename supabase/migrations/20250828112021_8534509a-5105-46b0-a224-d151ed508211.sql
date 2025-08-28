-- Give admin access to levic.vlad@mail.ru
-- First, find the user ID and insert admin role
DO $$
DECLARE
    user_uuid uuid;
BEGIN
    -- Get the user ID from auth.users (need to use a more direct approach)
    -- Since we can't directly query auth.users, we'll use the email from profiles
    SELECT id INTO user_uuid FROM public.profiles WHERE email = 'levic.vlad@mail.ru';
    
    -- If user exists in profiles, add admin role
    IF user_uuid IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (user_uuid, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'Admin role added for user %', user_uuid;
    ELSE
        RAISE NOTICE 'User with email levic.vlad@mail.ru not found in profiles table';
    END IF;
END $$;