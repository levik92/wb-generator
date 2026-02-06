

# Исправление ошибок генерации: двойные retry и "Failed to fetch"

## Что происходит сейчас

На скриншотах видны две ошибки:
- "Ошибка загрузки изображения: Failed to fetch" (десктоп, 21:25)
- "Генерация не удалась" (мобильный, 13:20)

Анализ базы данных за последние 7 дней показывает:

| Тип ошибки | Количество |
|------------|-----------|
| Edge Function non-2xx (бессмысленные retry) | 36 |
| timeout_cleanup (зависшие задания - уже починено) | 30 |
| "Ошибка при обработке задачи" (финал бессмысленных retry) | 24 |
| google_400_bad_request | 16 |
| IMAGE_SAFETY (фильтр безопасности) | 3 |
| upload_failed / MALFORMED_FUNCTION_CALL | 2 |

Один пользователь (user_id: 09121bcb) пытался сгенерировать "Металлическая машинка" **8 раз подряд** -- и каждый раз получал ошибку с 3 бесполезными retry. Скорее всего, Google API отклоняет его изображение (ошибка 400), но из-за бага система делает 3 повторные попытки вместо мгновенного отказа.

## Корневая причина

Конфликт между двумя edge-функциями:

1. `process-google-task` получает ошибку от Google API
2. Он помечает задачу как `failed` в БД, возвращает токены
3. Но затем делает `throw new Error(...)`, что возвращает HTTP 500
4. `process-generation-tasks-banana` (оркестратор) видит HTTP 500
5. Из-за гонки состояний он может не увидеть, что задача уже `failed`
6. Оркестратор делает 3 retry -- бессмысленно, тратя время пользователя (~1 минута)
7. После 3 retry записывает "Ошибка при обработке задачи" -- и может сделать двойной возврат токенов

## Что будет исправлено

### 1. `process-google-task/index.ts` -- не бросать исключение после обработки ошибки

Во всех 6 местах, где ошибка уже обработана (задача помечена failed, токены возвращены), заменить `throw new Error(...)` на `return new Response(JSON.stringify({ success: false, handled: true }), { status: 200 })`.

Это затрагивает обработчики:
- Google API 429/403/503 (строка ~400)
- Google API 400 (строка ~423)
- Общая ошибка API (строка ~444)
- Пустой ответ AI / IMAGE_SAFETY (строка ~496)
- Ошибка загрузки в Storage (строка ~532)
- Ошибка получения URL (строка ~559)

### 2. `process-generation-tasks-banana/index.ts` -- умная обработка ответа

В функции `processTask`:
- После вызова `process-google-task`, проверять `result.data?.handled` -- если true, не делать retry
- В блоке catch добавить задержку 500мс и перечитать статус задачи из БД перед retry
- Добавить список нерешаемых ошибок (google_400, IMAGE_SAFETY, upload_failed, no_image_generated, MALFORMED_FUNCTION_CALL) -- не делать retry для них

## Ожидаемый результат

- Устранение ~60 ложных ошибок в неделю
- Мгновенный отказ вместо ~1 минуты ожидания при нерешаемых ошибках
- Исключение риска двойного возврата токенов
- Пользователи быстрее получают понятное сообщение об ошибке

## Технические детали

### Файл: `supabase/functions/process-google-task/index.ts`

В 6 местах заменяем паттерн:

```text
// БЫЛО (после пометки задачи failed и возврата токенов):
throw new Error(failMessage);

// СТАЛО:
return new Response(
  JSON.stringify({ success: false, handled: true, error: failMessage }),
  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

### Файл: `supabase/functions/process-generation-tasks-banana/index.ts`

В функции `processTask` (строки 326-475):

1. После вызова `supabase.functions.invoke(...)` -- проверяем `handled`:

```text
const result = await supabase.functions.invoke('process-google-task', { body: {...} });
if (result.data?.handled === true) {
  console.log(`Task ${task.id} error already handled by processor`);
  return; // Не retry
}
if (result.error) throw result.error;
```

2. В блоке catch добавляем проверку нерешаемых ошибок:

```text
// Задержка 500мс для синхронизации БД
await new Promise(resolve => setTimeout(resolve, 500));

// Перечитываем статус задачи
const { data: currentTask } = await supabase
  .from('generation_tasks').select('status, last_error').eq('id', task.id).single();

// Если уже обработано -- выходим
if (currentTask?.status === 'completed' || currentTask?.status === 'failed') return;

// Список ошибок, при которых retry бесполезен
const NON_RETRYABLE = ['google_400', 'no_image_generated', 'IMAGE_SAFETY', 
                        'upload_failed', 'MALFORMED_FUNCTION_CALL', 'too_large'];
if (NON_RETRYABLE.some(e => currentTask?.last_error?.includes(e))) return;
```

