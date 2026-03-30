

## Исправление зависания кнопки оплаты

### Проблема
При нажатии "Выбрать" кнопка показывает "Создание..." и сразу сбрасывается, потому что блок `finally { setLoading(null) }` срабатывает мгновенно после `return` в ветке CloudPayments. Виджет оплаты ещё не открылся, а кнопка уже снова активна — пользователь кликает повторно, создавая дубли платежей (9 штук у одного пользователя).

### Что исправляем

**Файл: `src/components/dashboard/Pricing.tsx`**

1. **Убираем `finally` блок** — он преждевременно сбрасывает loading
2. **Добавляем `await` на `widget.start()`** — кнопка остаётся заблокированной пока виджет открыт
3. **Сбрасываем loading явно** в каждой ветке: после закрытия виджета CloudPayments, после ошибки, не сбрасываем при редиректе на YooKassa
4. **Добавляем защиту от повторных кликов** через `useRef` флаг `isPaymentInProgress`

### Схема изменений

```text
Было:                          Станет:
try {                          try {
  setLoading(pkg)                if (ref.current) return
  ...                            ref.current = true
  widget.start() // не ждём      setLoading(pkg)
  return                         ...
} finally {                      await widget.start() // ждём
  setLoading(null) // БАГ!       setLoading(null)
}                              } catch {
                                 setLoading(null)
                               } finally {
                                 ref.current = false
                               }
```

Зависшие дубли pending-платежей автоматически очистятся существующим крон-джобом `cleanup-stale-payments` через час.

