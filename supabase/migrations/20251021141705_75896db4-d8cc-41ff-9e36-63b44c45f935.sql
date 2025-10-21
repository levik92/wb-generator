-- Партнерская программа (отдельная от реферальной)

-- Таблица партнеров
CREATE TABLE IF NOT EXISTS partner_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL UNIQUE,
  partner_code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'suspended')),
  commission_rate integer NOT NULL DEFAULT 20,
  total_earned numeric(10, 2) NOT NULL DEFAULT 0,
  current_balance numeric(10, 2) NOT NULL DEFAULT 0,
  invited_clients_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Таблица партнерских рефералов (связь партнер -> клиент)
CREATE TABLE IF NOT EXISTS partner_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partner_profiles(id) ON DELETE CASCADE NOT NULL,
  referred_user_id uuid REFERENCES auth.users NOT NULL,
  registered_at timestamp with time zone DEFAULT now() NOT NULL,
  first_payment_at timestamp with time zone,
  total_payments numeric(10, 2) NOT NULL DEFAULT 0,
  total_commission numeric(10, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'active', 'inactive'))
);

-- Таблица выплат партнерам (комиссии от платежей рефералов)
CREATE TABLE IF NOT EXISTS partner_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partner_profiles(id) ON DELETE CASCADE NOT NULL,
  referral_id uuid REFERENCES partner_referrals(id) ON DELETE CASCADE NOT NULL,
  payment_id uuid REFERENCES payments(id) ON DELETE CASCADE NOT NULL,
  commission_amount numeric(10, 2) NOT NULL,
  commission_rate integer NOT NULL,
  payment_amount numeric(10, 2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  paid_at timestamp with time zone
);

-- Таблица запросов на вывод средств
CREATE TABLE IF NOT EXISTS partner_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partner_profiles(id) ON DELETE CASCADE NOT NULL,
  amount numeric(10, 2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  payment_method text,
  payment_details jsonb,
  requested_at timestamp with time zone DEFAULT now() NOT NULL,
  processed_at timestamp with time zone,
  notes text
);

-- Индексы для оптимизации
CREATE INDEX idx_partner_profiles_user_id ON partner_profiles(user_id);
CREATE INDEX idx_partner_profiles_code ON partner_profiles(partner_code);
CREATE INDEX idx_partner_referrals_partner_id ON partner_referrals(partner_id);
CREATE INDEX idx_partner_referrals_referred_user ON partner_referrals(referred_user_id);
CREATE INDEX idx_partner_commissions_partner_id ON partner_commissions(partner_id);
CREATE INDEX idx_partner_commissions_created_at ON partner_commissions(created_at);
CREATE INDEX idx_partner_withdrawals_partner_id ON partner_withdrawals(partner_id);

-- RLS политики
ALTER TABLE partner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_withdrawals ENABLE ROW LEVEL SECURITY;

-- Партнеры могут видеть свой профиль
CREATE POLICY "Partners can view own profile"
  ON partner_profiles FOR SELECT
  USING (user_id = auth.uid());

-- Партнеры могут создать свой профиль
CREATE POLICY "Users can create partner profile"
  ON partner_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Партнеры могут обновлять свой профиль
CREATE POLICY "Partners can update own profile"
  ON partner_profiles FOR UPDATE
  USING (user_id = auth.uid());

-- Партнеры могут видеть своих рефералов
CREATE POLICY "Partners can view own referrals"
  ON partner_referrals FOR SELECT
  USING (partner_id IN (SELECT id FROM partner_profiles WHERE user_id = auth.uid()));

-- Система может создавать рефералов
CREATE POLICY "Service can create referrals"
  ON partner_referrals FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Партнеры могут видеть свои комиссии
CREATE POLICY "Partners can view own commissions"
  ON partner_commissions FOR SELECT
  USING (partner_id IN (SELECT id FROM partner_profiles WHERE user_id = auth.uid()));

-- Система может создавать комиссии
CREATE POLICY "Service can create commissions"
  ON partner_commissions FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Партнеры могут видеть свои запросы на вывод
CREATE POLICY "Partners can view own withdrawals"
  ON partner_withdrawals FOR SELECT
  USING (partner_id IN (SELECT id FROM partner_profiles WHERE user_id = auth.uid()));

-- Партнеры могут создавать запросы на вывод
CREATE POLICY "Partners can create withdrawals"
  ON partner_withdrawals FOR INSERT
  WITH CHECK (partner_id IN (SELECT id FROM partner_profiles WHERE user_id = auth.uid()));

-- Админы могут видеть всё
CREATE POLICY "Admins can view all partner data"
  ON partner_profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can view all referrals"
  ON partner_referrals FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can view all commissions"
  ON partner_commissions FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage withdrawals"
  ON partner_withdrawals FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Функция для генерации уникального кода партнера
CREATE OR REPLACE FUNCTION generate_partner_code()
RETURNS text AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Генерируем 8-символьный код
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    -- Проверяем уникальность
    SELECT EXISTS(SELECT 1 FROM partner_profiles WHERE partner_code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_partner_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER partner_profiles_updated_at
  BEFORE UPDATE ON partner_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_partner_updated_at();

-- Функция для начисления комиссий при успешном платеже
CREATE OR REPLACE FUNCTION process_partner_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_partner_id uuid;
  v_referral_id uuid;
  v_commission_rate integer;
  v_commission_amount numeric;
BEGIN
  -- Проверяем, что платеж успешен
  IF NEW.status = 'succeeded' AND OLD.status != 'succeeded' THEN
    -- Находим партнерского реферала
    SELECT pr.id, pr.partner_id, pp.commission_rate
    INTO v_referral_id, v_partner_id, v_commission_rate
    FROM partner_referrals pr
    JOIN partner_profiles pp ON pp.id = pr.partner_id
    WHERE pr.referred_user_id = NEW.user_id
    AND pp.status = 'active'
    LIMIT 1;
    
    -- Если есть активный партнер
    IF v_partner_id IS NOT NULL THEN
      -- Рассчитываем комиссию
      v_commission_amount := NEW.amount * v_commission_rate / 100;
      
      -- Создаем запись о комиссии
      INSERT INTO partner_commissions (
        partner_id,
        referral_id,
        payment_id,
        commission_amount,
        commission_rate,
        payment_amount,
        status
      ) VALUES (
        v_partner_id,
        v_referral_id,
        NEW.id,
        v_commission_amount,
        v_commission_rate,
        NEW.amount,
        'pending'
      );
      
      -- Обновляем статистику партнера
      UPDATE partner_profiles
      SET 
        total_earned = total_earned + v_commission_amount,
        current_balance = current_balance + v_commission_amount,
        updated_at = now()
      WHERE id = v_partner_id;
      
      -- Обновляем статистику реферала
      UPDATE partner_referrals
      SET 
        total_payments = total_payments + NEW.amount,
        total_commission = total_commission + v_commission_amount,
        first_payment_at = COALESCE(first_payment_at, now()),
        status = 'active'
      WHERE id = v_referral_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер на таблицу payments
CREATE TRIGGER partner_commission_on_payment
  AFTER UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION process_partner_commission();