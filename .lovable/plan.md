

## Защита от обхода системы начисления токенов

### Проблема
Любой, у кого есть доступ к SQL Editor в Supabase (или service_role ключ), может напрямую изменить `tokens_balance` в таблице `profiles`, минуя функцию `admin_update_user_tokens()` и всю систему логирования. Именно так пользователю `artemgm2@gmail.com` были начислены ~1399 токенов без записи в `token_transactions`.

### Решение
Создать PostgreSQL-триггер на таблице `profiles`, который **автоматически** записывает любое изменение `tokens_balance` в `token_transactions` и `security_events`, независимо от того, как это изменение было сделано.

### Что будет реализовано

**1. Триггерная функция `track_token_balance_change()`**
- Срабатывает при любом UPDATE на `profiles`, если `tokens_balance` изменился
- Проверяет, была ли уже создана запись в `token_transactions` за последние 2 секунды с таким же изменением (чтобы не дублировать записи от `admin_update_user_tokens`)
- Если записи нет -- создаёт запись с типом `direct_sql_update` и описанием "Прямое изменение баланса"
- Логирует событие в `security_events` как подозрительную активность

**2. Триггер `on_tokens_balance_change`**
- Привязан к таблице `profiles`
- Срабатывает AFTER UPDATE
- Условие: `OLD.tokens_balance IS DISTINCT FROM NEW.tokens_balance`

### Как это работает

```text
Сценарий A: Админ меняет баланс через интерфейс
+------------------------------------------+
| 1. AdminUsers.tsx вызывает               |
|    admin_update_user_tokens()            |
| 2. Функция пишет в token_transactions   |
| 3. Функция делает UPDATE profiles       |
| 4. Триггер видит: запись уже есть       |
|    -> ничего не делает (нет дубля)       |
+------------------------------------------+

Сценарий B: Кто-то делает прямой SQL UPDATE
+------------------------------------------+
| 1. UPDATE profiles SET tokens_balance=X  |
| 2. Триггер видит: записи нет            |
|    -> создает запись в token_transactions |
|    -> логирует в security_events         |
+------------------------------------------+
```

### Совместимость с админ-панелью
- Функция `admin_update_user_tokens()` продолжит работать как раньше
- Триггер проверяет наличие недавней записи, чтобы избежать дублирования
- Никакие изменения в коде фронтенда не нужны

### Технические детали

Одна SQL-миграция, которая создаст:
1. Функцию `track_token_balance_change()` (SECURITY DEFINER, search_path = public)
2. Триггер `on_tokens_balance_change` на таблице `profiles` (AFTER UPDATE, WHEN tokens_balance changed)

Дедупликация: функция ищет в `token_transactions` запись с тем же `user_id` и `amount`, созданную за последние 2 секунды -- если найдена, триггер не создаёт дубль.

