-- Новое поле для трекинга активности
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz NOT NULL DEFAULT now();

-- Бэкфилл: используем updated_at как стартовое значение для существующих юзеров
UPDATE public.profiles 
SET last_active_at = updated_at 
WHERE last_active_at < updated_at;

-- Индекс для быстрых выборок активных пользователей
CREATE INDEX IF NOT EXISTS idx_profiles_last_active_at ON public.profiles(last_active_at DESC);

-- Обновляем функцию: пишем в last_active_at, а не в updated_at
CREATE OR REPLACE FUNCTION public.update_profile_on_login(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE profiles
  SET last_active_at = now(),
      login_count = login_count + 1
  WHERE id = user_id_param;
END;
$$;

-- Лёгкая функция для тача активности без инкремента login_count (для возвратов с активной сессией)
CREATE OR REPLACE FUNCTION public.touch_profile_activity(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE profiles
  SET last_active_at = now()
  WHERE id = user_id_param 
    AND (last_active_at IS NULL OR last_active_at < now() - interval '10 minutes');
END;
$$;