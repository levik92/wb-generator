## Что добавить

В админке `Оплаты → Оплата по счёту` — кнопка **«Создать счёт вручную»**, которая открывает диалог с полями:
- Email пользователя (поиск по profiles, обязательное)
- Название тарифа / назначение (текст, по умолчанию «Ручное пополнение»)
- Сумма в рублях
- Количество токенов
- Номер счёта
- Дата счёта
- Примечание для админа (опционально)

После создания — счёт со статусом **«Ожидает подтверждения»** падает в общий список счетов в этой же вкладке. Админ нажимает ✓ — токены начисляются, ✗ — счёт отклоняется (используется существующий механизм `process_invoice_payment`).

## Как будет отражаться (требования пользователя)

После подтверждения вручную созданного счёта:
1. **Баланс пользователя** — токены добавляются (через bypass-флаг защиты).
2. **История пополнений в кабинете** — уже работает: `PaymentHistory.tsx` тянет из `invoice_payments`.
3. **`token_transactions`** — пишется запись с `transaction_type='invoice_payment'` и описанием «Оплата по счёту #XXX (ручное начисление администратором)» → видна в детализации пользователя в админке.
4. **Общая аналитика сервиса** — сейчас `admin-analytics` считает только из `payments`. Чтобы ручные начисления учитывались в выручке, конверсии и среднем чеке, при `approve` будет дополнительно создаваться строка в `payments` с `status='succeeded'`, `payment_provider='manual_invoice'`, `confirmed_at=now()`. Это автоматически покрывает и ручные, и обычные счета юр.лиц.
5. **Вкладка «Оплаты» в админке** — ручной счёт также появится в общем списке платежей (т.к. строка пишется в `payments`).

## Технические изменения

### Миграция БД
- `invoice_payments`: сделать `organization_id` и `package_id` **nullable** (для ручных счетов организации/пакета может не быть).
- Добавить колонки `created_by uuid` и `is_manual boolean default false` для аудита.
- Обновить функцию `process_invoice_payment`: при `approve` дополнительно `INSERT INTO payments (user_id, package_name, amount, tokens_amount, status, payment_provider, external_payment_id, confirmed_at, metadata)` со ссылкой на `invoice_id` в metadata. Защита от дублей: проверка по `external_payment_id = 'invoice_' || v_invoice.id`.
- Новая RPC `admin_create_manual_invoice(p_email, p_amount, p_tokens, p_invoice_number, p_invoice_date, p_package_name, p_notes)` — `SECURITY DEFINER`, проверяет что вызвавший — admin, находит user_id по email, создаёт `invoice_payments` со статусом `awaiting_confirmation`, `is_manual=true`, без `organization_id`/`package_id`.

### Frontend
- `src/components/admin/AdminPayments.tsx`: новая кнопка «Создать счёт вручную» в шапке вкладки «Оплата по счёту», открывает `Dialog` с формой; после успешного создания — `loadInvoices()`.
- В таблице счетов добавить визуальный маркер «Ручной» для `is_manual=true` (badge).
- Тип `InvoicePayment` дополняется `is_manual?: boolean`.

### Безопасность
- Создание счёта — только через RPC под `SECURITY DEFINER` с проверкой `has_role(auth.uid(),'admin')`.
- Подтверждение — через существующий `process_invoice_payment` (уже проверяется через RLS-доступ админа).

## Что НЕ меняется
- Поток обычных счетов через `create-tochka-invoice` остаётся прежним.
- UI пользователя, кроме отображения новой записи в истории, не меняется.
- Структура аналитики не переписывается — просто `payments` обогащается строками от подтверждённых счетов.