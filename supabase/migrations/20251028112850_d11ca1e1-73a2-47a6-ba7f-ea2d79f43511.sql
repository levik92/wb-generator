-- Функция для создания записи в partner_referrals при регистрации реферала
CREATE OR REPLACE FUNCTION handle_new_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id uuid;
BEGIN
  -- Если есть referred_by, создаем запись в partner_referrals
  IF NEW.referred_by IS NOT NULL THEN
    -- Находим partner_id по user_id
    SELECT id INTO v_partner_id
    FROM partner_profiles
    WHERE user_id = NEW.referred_by
    LIMIT 1;
    
    -- Если партнер найден, создаем запись о реферале
    IF v_partner_id IS NOT NULL THEN
      INSERT INTO partner_referrals (
        partner_id,
        referred_user_id,
        registered_at,
        status
      ) VALUES (
        v_partner_id,
        NEW.id,
        NEW.created_at,
        'registered'
      )
      ON CONFLICT DO NOTHING;
      
      -- Обновляем счетчик приглашенных клиентов
      UPDATE partner_profiles
      SET 
        invited_clients_count = (
          SELECT COUNT(*) 
          FROM partner_referrals 
          WHERE partner_id = v_partner_id
        ),
        updated_at = now()
      WHERE id = v_partner_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Создаем триггер на вставку в profiles
DROP TRIGGER IF EXISTS on_profile_created_referral ON profiles;
CREATE TRIGGER on_profile_created_referral
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_referral();

-- Функция для синхронизации существующих рефералов
CREATE OR REPLACE FUNCTION sync_existing_referrals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_record RECORD;
  v_partner_id uuid;
BEGIN
  -- Перебираем все профили с referred_by, которых нет в partner_referrals
  FOR profile_record IN 
    SELECT p.id, p.referred_by, p.created_at
    FROM profiles p
    WHERE p.referred_by IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM partner_referrals pr WHERE pr.referred_user_id = p.id
    )
  LOOP
    -- Находим partner_id
    SELECT id INTO v_partner_id
    FROM partner_profiles
    WHERE user_id = profile_record.referred_by
    LIMIT 1;
    
    -- Если партнер найден, создаем запись
    IF v_partner_id IS NOT NULL THEN
      INSERT INTO partner_referrals (
        partner_id,
        referred_user_id,
        registered_at,
        status
      ) VALUES (
        v_partner_id,
        profile_record.id,
        profile_record.created_at,
        'registered'
      )
      ON CONFLICT DO NOTHING;
      
      -- Обновляем счетчик
      UPDATE partner_profiles
      SET 
        invited_clients_count = (
          SELECT COUNT(*) 
          FROM partner_referrals 
          WHERE partner_id = v_partner_id
        ),
        updated_at = now()
      WHERE id = v_partner_id;
    END IF;
  END LOOP;
END;
$$;

-- Синхронизируем существующие данные
SELECT sync_existing_referrals();