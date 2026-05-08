## Проблема

У `niggamaxxx@yandex.ru` в списке активных задач висят 5 генераций (самая старая — с 20 апреля). Все они в статусе `pending`, а не `processing` — фоновый вызов `process-generation-tasks-*` так и не успел перевести джобу в `processing` (вероятно, edge function упала/таймаутнула на старте, или сетевой сбой при `functions.invoke`).

`cleanup-stale-jobs` (cron */5 мин) **не ловит такие задачи**: он ищет только `status='processing'`. Любая джоба, которая упала до перехода в processing, висит вечно. Глобально таких сейчас **12** по всей базе.

Таймер не «не сработал» — его просто нет для `pending`-веток.

## План правки

### 1. Расширить `supabase/functions/cleanup-stale-jobs/index.ts`

Добавить третий запрос — `pending` джобы старше 10 минут:

```ts
const { data: stalePendingJobs } = await supabase
  .from('generation_jobs')
  .select('id, user_id, product_name, tokens_cost, total_cards, started_at, created_at')
  .eq('status', 'pending')
  .lt('created_at', staleThreshold);
```

Слить их в тот же `staleJobsMap`. Дальнейшая логика (отметить таски failed, вернуть токены, отправить уведомление, проставить `status='failed'` + `error_message`) уже работает корректно — у `pending`-джоб все таски тоже `pending`, поэтому полный возврат токенов произойдёт автоматически.

Также для симметрии — добавить чистку `video_generation_jobs.status='pending'` старше 10 минут (сейчас тоже только `processing`).

### 2. Одноразовая миграция — починить уже зависшие 12 джоб

SQL-миграция, которая для каждой `generation_jobs` со `status='pending'` старше 1 часа:
- помечает все её таски как `failed` (`last_error='timeout_cleanup_backfill'`),
- начисляет возврат токенов = `tokens_cost` через `refund_tokens(user_id, tokens_cost, 'Возврат за зависшую задачу генерации')`,
- ставит `status='failed'`, `error_message='Задача не была запущена (таймаут постановки в очередь)'`, `completed_at=now()`,
- вставляет уведомление пользователю.

Аналогично для `video_generation_jobs.status='pending'` старше 1 часа.

Реализовать через DO-блок (цикл по строкам), чтобы корректно вызвать `refund_tokens` для каждого пользователя.

### 3. Проверка

После миграции прогнать `select status, count(*) from generation_jobs where status in ('pending','processing') and created_at < now()-interval '15 minutes'` — должен вернуть 0 строк. Дальнейшие зависания будет автоматически вычищать обновлённый cron каждые 5 минут.

## Что не меняется

- Бизнес-логика генерации, RLS, цены, шифрование, чат поддержки — без изменений.
- Cron расписание (`*/5 * * * *`) остаётся прежним.
- `get-active-jobs` и фронтенд тоже не трогаем — после очистки джобы естественным образом исчезнут из списка активных.