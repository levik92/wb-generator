

## Аудит: оплата, админка и уязвимости

### Статус оплаты и админки

**Оплата — работает корректно:**
- `create-payment` — проверяет JWT, поддерживает YooKassa и CloudPayments, валидирует пакеты и промокоды
- `yookassa-webhook` — проверяет подпись HMAC + IP, обрабатывает `payment.succeeded` и `payment.canceled`
- `cloudpayments-webhook` — проверяет HMAC, обрабатывает `pay` и `fail` с уведомлениями
- `process_payment_success` (DB function) — атомарно начисляет токены, обновляет статус, логирует

**Админка — работает корректно:**
- `admin-analytics` — теперь защищён JWT + проверка роли `admin` (исправлено ранее)
- Клиентская часть (`AdminAnalyticsChart`) корректно вызывает функцию с `Authorization` заголовком

### Найденные уязвимости (требуют исправления)

**КРИТИЧЕСКИЕ (error):**

1. **`token_transactions` — любой пользователь может вставлять записи** (PRIVILEGE_ESCALATION)
   - Политика `System can insert transactions` с `WITH CHECK: true` для `public`
   - Злоумышленник может создавать фальшивые записи о транзакциях
   - **Исправление:** ограничить INSERT только для `service_role`

2. **`referrals` / `referrals_completed` — мошенничество с рефералами** (PRIVILEGE_ESCALATION)
   - Политики INSERT с `WITH CHECK: true` для `public`
   - Любой может создавать фальшивые реферальные связи
   - **Исправление:** ограничить INSERT только для `service_role`

3. **`telegram_bot_subscribers` — утечка персональных данных** (EXPOSED_SENSITIVE_DATA)
   - 92 записи с именами, фамилиями, username и chat_id доступны публично
   - Политика `Service role can manage subscribers` применена к `public` вместо `service_role`
   - **Исправление:** пересоздать политику только для `service_role`

**СРЕДНИЕ (warn):**

4. **`check-email-exists` — перечисление email без аутентификации**
   - Позволяет узнать, зарегистрирован ли email
   - **Исправление:** добавить проверку JWT

5. **`admin_profile_access_rate_limit` — любой может сбрасывать rate limit**
   - **Исправление:** ограничить для `service_role`

6. **`profile_access_audit` — любой может вставлять фальшивые записи аудита**
   - **Исправление:** ограничить INSERT для `service_role`

7. **Несколько функций без `SET search_path`** — потенциальный search path hijacking

8. **OTP с длинным сроком жизни, нет защиты от утёкших паролей, устаревший Postgres** — настраивается в дашборде Supabase

### План исправлений

**Одна SQL-миграция**, которая:

```sql
-- 1. token_transactions: INSERT только для service_role
DROP POLICY "System can insert transactions" ON token_transactions;
CREATE POLICY "Service role can insert transactions"
  ON token_transactions FOR INSERT TO service_role
  WITH CHECK (true);

-- 2. referrals: INSERT только для service_role
DROP POLICY "System can insert referrals" ON referrals;
CREATE POLICY "Service role can insert referrals"
  ON referrals FOR INSERT TO service_role
  WITH CHECK (true);

-- 3. referrals_completed: INSERT только для service_role
DROP POLICY "System can insert completed referrals" ON referrals_completed;
CREATE POLICY "Service role can insert completed referrals"
  ON referrals_completed FOR INSERT TO service_role
  WITH CHECK (true);

-- 4. telegram_bot_subscribers: ALL только для service_role
DROP POLICY "Service role can manage subscribers" ON telegram_bot_subscribers;
CREATE POLICY "Service role can manage subscribers"
  ON telegram_bot_subscribers FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 5. admin_profile_access_rate_limit: только service_role
DROP POLICY "System can manage rate limit records" ON admin_profile_access_rate_limit;
CREATE POLICY "Service role can manage rate limit records"
  ON admin_profile_access_rate_limit FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 6. profile_access_audit: INSERT только для service_role
DROP POLICY "System can insert profile access audit" ON profile_access_audit;
CREATE POLICY "Service role can insert profile access audit"
  ON profile_access_audit FOR INSERT TO service_role
  WITH CHECK (true);
```

**Edge-функция `check-email-exists`:** добавить проверку JWT (аналогично `admin-analytics`).

**Рекомендации для дашборда Supabase (вручную):**
- Включить защиту от утёкших паролей (HIBP)
- Уменьшить время жизни OTP
- Обновить версию Postgres

