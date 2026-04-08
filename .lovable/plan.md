## Задача: добавить `paymentSchema: 'Single'` в вызов виджета CloudPayments

### Текущая ситуация

- В Edge Function (`create-payment/index.ts`, строка 190) параметр `paymentSchema: 'Single'` уже установлен и передаётся на фронт в `intentParams`
- Но на фронте в `Pricing.tsx` при вызове `widget.pay('auth', {...})` этот параметр **не передаётся** в объект параметров виджета
- Из-за этого CloudPayments использует схему по умолчанию (двухстадийную), и транзакции попадают в статус «Авторизовано» вместо немедленного списания

### Что нужно сделать

**Файл: `src/components/dashboard/Pricing.tsx**` (единственное изменение)

В объект параметров `widget.pay('auth', {...})` добавить одну строку:

```typescript
widget.pay('auth',
  {
    publicId: params.publicTerminalId,
    description: params.description,
    amount: params.amount,
    currency: params.currency,
    invoiceId: params.externalId,
    accountId: params.userInfo?.accountId,
    email: params.userInfo?.email,
    skin: params.skin || 'modern',
    paymentSchema: 'Single',        // ← добавить эту строку
    data: params.metadata,
  },
  { ... }
);
```

Больше никакие файлы и функции не затрагиваются и твоя задача при изменении не затрагивать никакие другие функции и файлы. 