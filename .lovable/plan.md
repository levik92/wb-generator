

## Диагностика: виджет CloudPayments не открывается

### Что выяснено

1. **Edge-функция работает** — у пользователя `feliks-serg@mail.ru` создано 10+ платежей со статусом `pending`/`expired`. Это значит, что кнопка нажимается, API-запрос проходит, данные возвращаются.

2. **Проблема на фронтенде** — после получения данных от API виджет CloudPayments не показывается пользователю.

### Вероятные причины

1. **Скрипт CloudPayments не загружается** — пользователь может использовать AdBlock или браузер блокирует `widget.cloudpayments.ru`. В этом случае `window.cp` будет `undefined`, и пользователь увидит toast «Виджет CloudPayments не загружен».

2. **`widget.pay('auth', ...)` — неправильный метод** — в коде вызывается `widget.pay('auth', ...)`, что соответствует двухстадийной схеме оплаты. При этом передаётся `paymentSchema: 'Single'`. По документации CloudPayments, для одностадийной оплаты нужно вызывать `widget.pay('charge', ...)`. Параметр `paymentSchema` не является стандартным параметром виджета и может игнорироваться или вызывать ошибку.

3. **Виджет открывается в popup** — некоторые браузеры блокируют popup-окна. Виджет CloudPayments может не показаться из-за popup-блокера.

### План исправления

**Файл: `src/components/dashboard/Pricing.tsx`**

1. Заменить `widget.pay('auth', ...)` на `widget.pay('charge', ...)` — это правильный метод для одностадийной оплаты (Single)

2. Убрать нестандартный параметр `paymentSchema: 'Single'` — он не нужен при использовании метода `charge`

3. Добавить расширенное логирование ошибок — чтобы понять, если проблема повторится, на каком этапе она возникает

### Техническое изменение

```typescript
// Было:
widget.pay('auth', {
  ...params,
  paymentSchema: 'Single',
});

// Станет:
widget.pay('charge', {
  publicId: params.publicTerminalId,
  description: params.description,
  amount: params.amount,
  currency: params.currency,
  invoiceId: params.externalId,
  accountId: params.userInfo?.accountId,
  email: params.userInfo?.email,
  skin: params.skin || 'modern',
  data: params.metadata,
});
```

Это одна строка — `'auth'` → `'charge'` и удаление `paymentSchema`. После этого виджет должен корректно открываться для одностадийного списания.

