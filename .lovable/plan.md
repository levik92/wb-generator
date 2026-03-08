

# Результат проверки: промокод «работает», но с потерями

## Что произошло при вашем тесте

Вы активировали промокод `123` — UI показал «успех», но на самом деле:

1. **Использование записалось** — строка в `promocode_uses` есть ✅
2. **Токены НЕ начислились** — в `token_transactions` нет записи с промокодом, баланс не изменился ❌
3. **Аудит не сохранён** — нет следа в истории транзакций ❌

То есть промокод «сгорел» (повторно его уже не ввести), но токены не пришли.

## Почему так вышло — 3 ошибки в коде

### Ошибка 1: `set_config` через RPC не работает

Строка 99: `adminClient.rpc('set_config', ...)` — `set_config` это системная Postgres-функция, PostgREST её не экспортирует. Вызов молча провалится. Без bypass-флага триггер `protect_tokens_on_update` **откатывает** изменение баланса.

### Ошибка 2: Фоллбэк `admin_update_user_tokens` тоже не работает

Строки 116-121: если первый update не прошёл, вызывается `admin_update_user_tokens`. Но эта функция проверяет `has_role(auth.uid(), 'admin')` — а через `service_role` клиент `auth.uid()` равен `NULL`, проверка не пройдёт.

### Ошибка 3: `transaction_type: 'promocode_redeem'` не существует

Строка 130: constraint на `token_transactions` допускает только: `purchase`, `generation`, `refund`, `promocode`, `referral_bonus`, `bonus`, `direct_sql_update`. Тип `'promocode_redeem'` отклоняется.

## План исправления

### 1. Миграция: создать PL/pgSQL функцию

Создать `redeem_promocode_tokens(p_user_id UUID, p_amount INT, p_code TEXT)` с `SECURITY DEFINER` — она внутри себя делает `set_config`, обновляет баланс и пишет аудит с правильным типом `'promocode'`. Одна атомарная операция.

### 2. Обновить edge function

- Убрать строки 97-132 (прямой update + fallback + audit insert)
- Заменить на один вызов: `adminClient.rpc('redeem_promocode_tokens', { p_user_id: userId, p_amount: tokensToAdd, p_code: sanitizedCode })`

### 3. Исправить уже «сгоревший» промокод

Миграция: сбросить использование промокода `123` — удалить запись из `promocode_uses` и уменьшить `current_uses`, чтобы вы могли его использовать повторно.

## Файлы

| Файл | Действие |
|---|---|
| Миграция SQL | Создать функцию `redeem_promocode_tokens` + сбросить использование промокода `123` |
| `supabase/functions/redeem-promocode/index.ts` | Заменить блок начисления на один RPC-вызов |

