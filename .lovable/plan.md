

## Диагноз

Активный провайдер оплаты — **CloudPayments**. Проблема в том, что виджет CloudPayments вызывается неправильно:

1. **`widget.start()`** — такого метода нет в CloudPayments SDK. Правильный метод: **`widget.pay('auth', options, callbacks)`**
2. **`widget.oncomplete = ...`** — нельзя так назначать колбэки. Они передаются третьим аргументом в `widget.pay()`
3. Edge function возвращает `publicTerminalId`, а CloudPayments ожидает `publicId`

В результате `widget.start()` молча завершается (или бросает ошибку, которая ловится catch), кнопка возвращается в активное состояние, и ничего не происходит.

## План исправления

### Файл: `src/components/dashboard/Pricing.tsx` (строки 123-165)

Заменить блок CloudPayments на правильный вызов API:

```typescript
if (data.provider === 'cloudpayments') {
  const cpLib = (window as any).cp;
  if (!cpLib) {
    toast({ title: "Ошибка", description: "Виджет CloudPayments не загружен.", variant: "destructive" });
    setLoading(null);
    return;
  }

  const widget = new cpLib.CloudPayments();
  const params = data.intentParams;

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
      data: params.metadata,
    },
    {
      onSuccess: (options: any) => {
        toast({ title: "Оплата прошла успешно!", description: `Начислено ${data.tokens || finalTokens} токенов` });
        window.location.href = '/dashboard?payment=success';
      },
      onFail: (reason: any, options: any) => {
        toast({ title: "Ошибка оплаты", description: reason || "Платёж не прошёл.", variant: "destructive" });
        setLoading(null);
      },
      onComplete: (paymentResult: any, options: any) => {
        setLoading(null);
        isPaymentInProgress.current = false;
      },
    }
  );
  return; // не сбрасываем loading здесь — onComplete/onFail сделают это
}
```

Ключевые изменения:
- `widget.start()` → `widget.pay('auth', options, callbacks)`
- Колбэки `onSuccess`/`onFail`/`onComplete` передаются как 3-й аргумент
- `publicTerminalId` → `publicId`
- `setLoading(null)` перенесен в колбэки (а не сразу после вызова)
- `isPaymentInProgress.current = false` сбрасывается в `onComplete`

