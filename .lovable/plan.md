# Исправление race condition CloudPayments + backfill записи платежа

## Контекст

Платёж [pekz25@bk.ru](mailto:pekz25@bk.ru) (`d187d89e-e62e-4232-bd51-96a56b1ebc55`, 9 990 ₽ / 850 токенов) застрял в статусе `failed`, хотя банковская транзакция прошла успешно со второй попытки. Причина: CloudPayments прислал `fail` webhook (DoNotHonor) → мы перевели payment в `failed`. Через 53 секунды пришёл `pay` webhook на тот же `InvoiceId`, но `process_payment_success` ищет только `status='pending'` → молча вышел.

Токены пользователю уже начислены вручную (admin bonus, +850 в `token_transactions`). Повторно НЕ начислять.

## Что делаем

### 1. Backfill записи платежа (без повторного начисления токенов)

Через миграцию (data update):

- `UPDATE payments SET status='succeeded', confirmed_at='2026-05-06 11:49:16+00' WHERE id='d187d89e-e62e-4232-bd51-96a56b1ebc55'`
  - Триггер `process_partner_commission` сработает, но у пользователя `referred_by IS NULL` и в `partner_referrals` его нет — комиссия не начислится. Безопасно.
- Токены НЕ трогаем (уже начислены админом).

### 2. Чиним webhook `cloudpayments-webhook/index.ts`

В ветке `notificationType === 'fail'`:

- Перестаём переводить платёж в `failed`, если `status != 'pending'` (защита от race с уже succeeded).
- Если `status = 'pending'` — оставляем `pending`, не помечаем `failed`. Это позволит следующему `pay` webhook на тот же `InvoiceId` (CloudPayments переиспользует InvoiceId при retry после DoNotHonor / InsufficientFunds) корректно отработать через существующую `process_payment_success`. Стейл-платежи всё равно подчистит `cleanup-stale-payments` через 30 минут.
- Уведомление о неудаче пользователю не шлём в этой ветке (иначе при успешном retry он получит и «не прошла», и «прошла»). Если очень нужно — можно слать через 30 минут из cleanup'а, но это отдельная задача.

В ветке `pay` оставляем как есть — `process_payment_success` уже идемпотентна по `status='pending'`.

### 3. Деплой и проверка

- Деплой `cloudpayments-webhook`.
- SQL-проверка: запись `d187d89e...` имеет статус `succeeded`, токены не задвоены.

## Технические детали

- Файл: `supabase/functions/cloudpayments-webhook/index.ts`, замена блока в строках 169–200 (ветка `fail`).
- Миграция: `UPDATE payments` + `INSERT INTO notifications`. Без изменений схемы.
- `process_payment_success` менять не требуется — после фикса webhook она будет вызываться по pending-записи как и задумано.

## Что НЕ делаем

- Не трогаем `tokens_balance` пользователя.
- Не вставляем в `token_transactions` (там уже есть admin bonus +850).
- Не меняем `process_payment_success` RPC.