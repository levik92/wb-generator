

## Исправление: админ не может обновить баланс токенов

### Корневая причина

При обновлении баланса через `admin_update_user_tokens` срабатывает AFTER-триггер `track_token_balance_change`, который пытается записать транзакцию с типом `direct_sql_update`. Этот тип **отсутствует** в CHECK-constraint таблицы `token_transactions`, что приводит к ошибке и откату всей операции.

Дополнительно: триггер не проверяет флаг `app.bypass_token_protection`, поэтому он срабатывает даже при легитимных изменениях через защищённые функции.

### Решение (одна SQL-миграция)

**1. Исправить триггерную функцию `track_token_balance_change()`**
- Добавить проверку: если `app.bypass_token_protection = 'true'`, значит изменение идёт через легитимную функцию -- пропускаем (RETURN NEW без записи)
- Логика `direct_sql_update` срабатывает только при реальном обходе системы (когда флаг НЕ установлен)

**2. Добавить `direct_sql_update` в CHECK-constraint**
- На случай, если кто-то действительно обойдёт систему напрямую через SQL, тип `direct_sql_update` должен быть разрешён в constraint

### Техническая реализация

```sql
-- 1. Обновить CHECK-constraint: добавить 'direct_sql_update'
ALTER TABLE token_transactions DROP CONSTRAINT token_transactions_transaction_type_check;
ALTER TABLE token_transactions ADD CONSTRAINT token_transactions_transaction_type_check
  CHECK (transaction_type = ANY (ARRAY[
    'purchase', 'generation', 'refund', 'promocode',
    'referral_bonus', 'bonus', 'direct_sql_update'
  ]));

-- 2. Обновить триггерную функцию: пропускать если bypass установлен
CREATE OR REPLACE FUNCTION track_token_balance_change() ...
  -- Если bypass_token_protection = 'true', значит легитимная функция
  -- уже сама записала транзакцию -- просто выходим
  IF current_setting('app.bypass_token_protection', true) = 'true' THEN
    RETURN NEW;
  END IF;
  -- Иначе: прямое изменение, логируем как direct_sql_update
```

### Результат

| Сценарий | До исправления | После исправления |
|---|---|---|
| Админ меняет баланс | Ошибка constraint, откат | Работает, записывается как `bonus` |
| Оплата через вебхук | Ошибка constraint, откат | Работает, записывается как `purchase` |
| Прямое изменение через SQL | Ошибка constraint | Записывается как `direct_sql_update` + лог в security_events |

Это также исправит повторяющиеся ошибки `token_transactions_transaction_type_check` в логах PostgreSQL.
