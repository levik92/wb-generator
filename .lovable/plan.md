

## Результат проверки: найдены 3 проблемы

### Проблема 1: Тип уведомления об оплате не совпадает с UI (обе версии)

Обе версии `process_payment_success` создают уведомление с типом `'success'`, но в `NotificationCenter.tsx` иконка кредитной карты привязана к типу `'payment_confirmed'`. Тип `'success'` попадает в `default` — показывается обычный колокольчик без цветовой стилизации.

**Решение:** Заменить тип `'success'` на `'payment_confirmed'` в обеих перегрузках `process_payment_success` (миграция SQL).

### Проблема 2: CloudPayments fail — нет уведомления пользователю

Когда CloudPayments присылает `?type=fail`, статус платежа обновляется на `failed`, но пользователь не получает уведомление. Аналогично, YooKassa `payment.canceled` обновляет статус, но тоже без уведомления.

**Решение:** Добавить `INSERT INTO notifications` в CloudPayments webhook (fail) и в YooKassa webhook (canceled):
- CloudPayments fail: после обновления статуса на `failed`, вставить уведомление с типом `'payment_confirmed'` и текстом «Оплата не прошла»
- YooKassa canceled: аналогично, уведомление «Оплата отменена»

### Проблема 3: NotificationCenter не обрабатывает типы отказа/отмены визуально

В UI нет специальной стилизации для неудачных платежей (красная иконка и т.п.).

**Решение:** Добавить тип `'payment_failed'` в `NotificationCenter.tsx` с красной стилизацией. Использовать этот тип для failed/canceled уведомлений.

---

## План исправлений

### 1. Миграция SQL
- `CREATE OR REPLACE FUNCTION process_payment_success(payment_id_param text)` — заменить тип `'success'` на `'payment_confirmed'`
- `CREATE OR REPLACE FUNCTION process_payment_success(payment_id_param text, external_id_param text)` — заменить тип `'success'` на `'payment_confirmed'`

### 2. CloudPayments webhook (`supabase/functions/cloudpayments-webhook/index.ts`)
- В блоке `notificationType === 'fail'`: добавить `INSERT INTO notifications` с типом `'payment_failed'`, получив `user_id` из записи платежа

### 3. YooKassa webhook (`supabase/functions/yookassa-webhook/index.ts`)
- В блоке `event === 'payment.canceled'`: добавить `INSERT INTO notifications` с типом `'payment_failed'`, получив `user_id` из записи платежа

### 4. NotificationCenter.tsx
- Добавить `'payment_failed'` в `getNotificationIcon` (иконка `CreditCard` или `XCircle`)
- Добавить `'payment_failed'` в `getNotificationColor` (красная стилизация)

