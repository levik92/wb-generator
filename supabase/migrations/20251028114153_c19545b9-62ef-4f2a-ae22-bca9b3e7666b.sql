-- Откатываем неправильное смешение реферальной и партнерской программ
-- Удаляем триггер, который смешивал две системы
DROP TRIGGER IF EXISTS on_profile_created_referral ON profiles;
DROP FUNCTION IF EXISTS handle_new_referral();
DROP FUNCTION IF EXISTS sync_existing_referrals();

-- Очищаем неправильные записи в partner_referrals, которые были созданы из referred_by
-- Оставляем только те, которые были созданы через partner_code
DELETE FROM partner_referrals
WHERE id IN (
  SELECT pr.id
  FROM partner_referrals pr
  INNER JOIN profiles p ON pr.referred_user_id = p.id
  INNER JOIN partner_profiles pp ON pr.partner_id = pp.id
  WHERE p.referred_by = pp.user_id
  AND NOT EXISTS (
    -- Проверяем, что не было логов о регистрации с partner_code
    SELECT 1 FROM security_events se
    WHERE se.user_id = p.id
    AND se.event_type IN ('partner_signup_success', 'partner_signup_invalid')
  )
);

-- Пересчитываем invited_clients_count для всех партнеров
UPDATE partner_profiles
SET invited_clients_count = (
  SELECT COUNT(*) 
  FROM partner_referrals 
  WHERE partner_id = partner_profiles.id
),
updated_at = now();

-- Комментарий для ясности:
-- РЕФЕРАЛЬНАЯ ПРОГРАММА (токены):
--   - Таблицы: referrals, referrals_completed
--   - Поле: profiles.referred_by
--   - Награда: 20 токенов за первую оплату
-- 
-- ПАРТНЕРСКАЯ ПРОГРАММА (комиссии):
--   - Таблицы: partner_profiles, partner_referrals, partner_commissions
--   - Регистрация: через partner_code в метаданных при signup
--   - Награда: 20% от всех платежей в рублях