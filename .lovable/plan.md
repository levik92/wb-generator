

## Аудит платежной системы — найденные проблемы

### Проблема 1: YooKassa webhook НЕ проверяет подпись (КРИТИЧНО)

Функция `verifyWebhookSignature` **определена, но нигде не вызывается**. Любой, кто знает URL вебхука, может отправить поддельный запрос `payment.succeeded` и начислить себе токены бесплатно.

**Сравнение с CloudPayments:** CloudPayments webhook корректно вызывает `verifyHmac()` и блокирует запросы с невалидной подписью. YooKassa — нет.

IP-проверка (`isFromYooKassa`) тоже только логирует, но не блокирует.

**Решение:** Добавить вызов `verifyWebhookSignature` в основной обработчик и блокировать запросы без валидной подписи. Также сделать IP-проверку блокирующей (с fallback на signature check).

### Проблема 2: Старая версия `process_payment_success` (1 параметр) не создает уведомления

В БД существуют **2 перегрузки** функции:
- 1-параметровая (payment_id_param) — вызывается из YooKassa webhook — **не создает notification** для пользователя
- 2-параметровая (payment_id_param, external_id_param) — вызывается из CloudPayments — **создает notification**

Пользователи, оплатившие через YooKassa, не получают уведомление "Оплата прошла успешно".

**Решение:** Обновить 1-параметровую версию, добавив `INSERT INTO notifications`.

### Проблема 3: `secure_payments_user_select` не включает статус `expired`

RLS-политика для пользователей:
```sql
status = ANY (ARRAY['pending', 'succeeded', 'failed', 'canceled'])
```

Статус `expired` отсутствует — пользователи не видят свои истекшие платежи в истории.

**Решение:** Добавить `'expired'` в массив допустимых статусов.

### Проблема 4: `secure_payments_webhook_insert` требует `yookassa_payment_id IS NOT NULL`

```sql
WITH CHECK (... AND yookassa_payment_id IS NOT NULL ...)
```

Но CloudPayments-платежи вставляются с `yookassa_payment_id: null` (строка 148 в create-payment). Это работает только потому что insert идет через service_role, который обходит RLS. Не критично, но стоит исправить для чистоты.

---

## План исправлений

### Файлы для изменения:

1. **`supabase/functions/yookassa-webhook/index.ts`**
   - Добавить вызов `verifyWebhookSignature()` после получения тела запроса
   - Сделать IP-проверку блокирующей (или хотя бы в связке с signature)
   - Если подпись невалидна И IP не из YooKassa — блокировать с 403

2. **Миграция SQL:**
   - Обновить 1-параметровую `process_payment_success`: добавить INSERT INTO notifications
   - Обновить RLS-политику `secure_payments_user_select`: добавить `'expired'` в список статусов
   - Обновить RLS-политику `secure_payments_webhook_insert`: сделать `yookassa_payment_id` nullable (заменить на `yookassa_payment_id IS NOT NULL OR external_payment_id IS NOT NULL`)

### Важные детали реализации:

- Проверка подписи YooKassa: если подпись отсутствует в заголовке (YooKassa может не всегда отправлять), фолбэк на IP-проверку
- Блокировка: если оба метода верификации провалены — вернуть 403 и залогировать событие
- Уведомление в 1-параметровой версии должно быть идентично 2-параметровой

