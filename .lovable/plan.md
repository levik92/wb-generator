

## Диагноз: виджет CloudPayments не открывает окно оплаты

### Что происходит
1. Edge Function `create-payment` **работает корректно** — записи `pending` создаются в БД (видно 10+ записей за последние минуты)
2. Ответ приходит с `provider: 'cloudpayments'` и `intentParams`
3. Скрипт `cloudpayments.js` подключен в `index.html` с атрибутом `defer`
4. На фронте код вызывает `widget.pay('auth', ...)`, но **окно оплаты не появляется**

### Вероятные причины

**1. Ошибка в колбэках CloudPayments (главная гипотеза)**
В коде `Pricing.tsx` колбэк `onComplete` вызывается **всегда** (даже при отмене), а `onFail` — при ошибке. Но если `widget.pay()` выбрасывает исключение синхронно (например, невалидный `publicId` или проблема с iframe), оно **проглатывается** — нет try/catch вокруг вызова `widget.pay()`.

**2. `defer` скрипт может не загрузиться вовремя**
Маловероятно, но `window.cp` может быть `undefined` на момент клика, если скрипт ещё грузится.

**3. CloudPayments Public ID невалиден**
Ключ `pk_b1cfae068ef78d5d1e6fad1807682` — нужно убедиться, что он активен в панели CloudPayments. Если терминал отключен или ID невалиден, виджет молча не показывается.

### План исправлений

**Файл: `src/components/dashboard/Pricing.tsx`**

1. **Обернуть `widget.pay()` в try/catch** — если виджет выбрасывает ошибку, показать toast и сбросить состояние
2. **Добавить логирование** — `console.log` перед вызовом `widget.pay()` для отладки
3. **Проверить `window.cp` более надёжно** — не только на наличие объекта, но и на наличие метода `CloudPayments`
4. **Сбросить `isPaymentInProgress` в `onFail`** — сейчас он там не сбрасывается, что блокирует повторные попытки

```typescript
// Ключевое изменение — обернуть widget.pay в try/catch:
try {
  const widget = new cpLib.CloudPayments();
  widget.pay('auth', { ... }, { onSuccess, onFail, onComplete });
} catch (widgetError) {
  console.error('[CloudPayments] Widget error:', widgetError);
  toast({ title: "Ошибка", description: "Не удалось открыть окно оплаты", variant: "destructive" });
  setLoading(null);
  isPaymentInProgress.current = false;
}
```

5. **Добавить `isPaymentInProgress.current = false` в `onFail`** — чтобы кнопка не блокировалась после неудачи

### Дополнительно
- Проверить в панели CloudPayments, что терминал с `publicId = pk_b1cfae068ef78d5d1e6fad1807682` активен
- В БД скопились ~10+ зависших `pending` записей — они будут очищены cron-задачей `cleanup-stale-payments` через час

