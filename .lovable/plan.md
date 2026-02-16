

## Исправление: создание защитного триггера tokens_balance

### Проблема
Предыдущая миграция с защитным триггером `protect_tokens_balance` **не была применена**. Проверка показала:
- Функция `protect_tokens_balance()` не существует в БД
- Триггер `protect_tokens_on_update` не создан на таблице `profiles`
- Ни одна из функций (`spend_tokens`, `process_payment_success`, `admin_update_user_tokens` и т.д.) не содержит флаг `bypass_token_protection`
- Уязвимость остается открытой: пользователь по-прежнему может изменить `tokens_balance` через консоль браузера

### Решение
Одна SQL-миграция, которая:

**1. Создаст триггерную функцию `protect_tokens_balance()`**
- BEFORE UPDATE на `profiles`
- Если `tokens_balance` изменился и флаг `app.bypass_token_protection` не установлен:
  - Сбрасывает значение к OLD (блокирует изменение)
  - Логирует попытку в `security_events`

**2. Создаст триггер `protect_tokens_on_update`**
- Тип: BEFORE UPDATE
- Срабатывает до аудит-триггера `on_tokens_balance_change`

**3. Обновит 7 функций, добавив `SET LOCAL app.bypass_token_protection = 'true'`:**
- `spend_tokens` -- списание за генерации
- `refund_tokens` -- возврат токенов
- `process_payment_success` -- зачисление после оплаты
- `process_referral_bonus_on_payment` -- реферальный бонус
- `approve_bonus_submission` -- одобрение бонусной заявки
- `admin_update_user_tokens` -- ручное изменение админом
- `track_token_balance_change` -- аудит-триггер (чтобы не блокировал сам себя)

Функция `use_promocode` уже обновлена в предыдущей миграции.

### Результат после применения

| Сценарий | Результат |
|---|---|
| Пользователь через консоль: `update({ tokens_balance: 9999 })` | Заблокировано, залогировано |
| Оплата через YooKassa (webhook) | Работает через `process_payment_success` |
| Генерация карточек | Работает через `spend_tokens` |
| Админ меняет баланс | Работает через `admin_update_user_tokens` |
| Промокод | Работает через `use_promocode` |
| Реферальный бонус | Работает через `process_referral_bonus_on_payment` |
| Бонусная программа | Работает через `approve_bonus_submission` |

