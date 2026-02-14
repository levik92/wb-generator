
# Исправление очистки зависших видео-задач

## Проблема

Функция `cleanup-stale-jobs` очищает только таблицу `generation_jobs` (карточки), но полностью игнорирует `video_generation_jobs`. Из-за этого:
- 5 задач зависли навсегда в статусе `processing` с потерей 50 токенов
- Пользователи не получили возврат токенов
- При возврате на страницу видят бесконечную загрузку

## План исправления

### 1. Обновить cleanup-stale-jobs

Добавить в edge-функцию `cleanup-stale-jobs` блок для обработки зависших видео-задач из `video_generation_jobs`:

- Найти задачи со статусом `processing`, созданные более 10 минут назад
- Пометить их как `failed` с сообщением об ошибке таймаута
- Вернуть токены через `refund_tokens`
- Отправить уведомление пользователю

### 2. Одноразовая очистка существующих задач

Выполнить SQL-миграцию для исправления 5 текущих зависших задач:

- Обновить их статус на `failed`
- Вернуть токены пользователям (50 токенов суммарно)

### Технические детали

В `cleanup-stale-jobs/index.ts` после основного блока очистки `generation_jobs` добавляется аналогичный блок:

```text
1. Запрос зависших video_generation_jobs (status=processing, created_at < threshold)
2. Для каждой задачи:
   - UPDATE status = 'failed', error_message = 'Таймаут генерации'
   - Вызов refund_tokens(user_id, tokens_cost)
   - INSERT notification для пользователя
3. Логирование количества очищенных задач
```

SQL-миграция для текущих зависших задач:

```text
- UPDATE video_generation_jobs SET status='failed', error_message='Таймаут генерации (очистка)' WHERE status='processing' AND created_at < now() - interval '1 hour'
- Для каждого уникального user_id: вызов refund_tokens с суммой tokens_cost
```
