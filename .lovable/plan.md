

## Закрытие уязвимости: запрет самостоятельного изменения tokens_balance

### Корневая причина
RLS-политика `secure_profiles_update` разрешает пользователю обновлять **любые поля** своего профиля, включая `tokens_balance`. Пользователь `artemgm2@gmail.com` воспользовался этим: через консоль браузера отправил `supabase.from('profiles').update({ tokens_balance: 1400 })` и получил бесплатные токены.

Доказательство из аудита: запись `self_update` с `fields_accessed: [tokens_balance]` в `2026-02-15 00:22:06`, за минуту до первых генераций.

### Решение
Создать `BEFORE UPDATE` триггер на таблице `profiles`, который **блокирует** изменение `tokens_balance` для обычных пользователей. Только системные функции (SECURITY DEFINER) смогут менять баланс.

### Что будет реализовано

**1. Триггерная функция `protect_tokens_balance()`**
- Срабатывает BEFORE UPDATE на `profiles`
- Если `tokens_balance` изменился:
  - Проверяет, вызвана ли функция из SECURITY DEFINER контекста (через `current_setting`)
  - Если нет -- откатывает изменение `tokens_balance` к старому значению (не блокирует весь UPDATE, только сбрасывает поле)
  - Логирует попытку в `security_events`

**2. Обновление всех легитимных функций**
Следующие функции уже являются SECURITY DEFINER и будут устанавливать флаг `app.bypass_token_protection = true` перед изменением баланса:
- `spend_tokens()`
- `refund_tokens()`
- `process_payment_success()`
- `process_referral_bonus_on_payment()`
- `approve_bonus_submission()`
- `admin_update_user_tokens()`
- `use_promocode()`
- `track_token_balance_change()` (наш триггер аудита тоже нужно обновить)

### Как это работает

```text
Сценарий A: Пользователь пытается обновить баланс через API
+--------------------------------------------------+
| 1. supabase.update({ tokens_balance: 9999 })     |
| 2. RLS пропускает (auth.uid() = id)              |
| 3. BEFORE UPDATE триггер проверяет:              |
|    - tokens_balance изменился? Да                 |
|    - app.bypass_token_protection = true? Нет      |
|    -> Сбрасывает tokens_balance к OLD значению    |
|    -> Логирует попытку в security_events          |
| 4. UPDATE выполняется, но баланс не меняется     |
+--------------------------------------------------+

Сценарий B: Система списывает токены через spend_tokens()
+--------------------------------------------------+
| 1. spend_tokens() -- SECURITY DEFINER            |
| 2. SET LOCAL app.bypass_token_protection = 'true' |
| 3. UPDATE profiles SET tokens_balance = ...       |
| 4. BEFORE UPDATE триггер проверяет:              |
|    - bypass = true? Да                            |
|    -> Пропускает, баланс меняется нормально      |
+--------------------------------------------------+
```

### Технические детали

Одна SQL-миграция:

1. Создание функции `protect_tokens_balance()` (BEFORE UPDATE триггер)
2. Создание триггера `protect_tokens_on_update` на `profiles`
3. Обновление всех 7+ функций, которые легитимно меняют баланс -- добавление `SET LOCAL app.bypass_token_protection = 'true'` в начало каждой

Порядок триггеров: `protect_tokens_on_update` (BEFORE) сработает до `track_token_balance_change` (AFTER), поэтому нелегитимные изменения будут заблокированы ещё до логирования.

### Дополнительно
- Заблокированному пользователю вы уже обнулили баланс (-269 токенов запись видна)
- После этого исправления подобная атака станет невозможной

