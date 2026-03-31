

## Диагностика и исправление Polza AI интеграции

### Обнаруженные проблемы

Проанализированы логи Edge Functions и код. Polza AI успешно генерирует изображения (видно в логах), но результат не доходит до пользователя из-за нескольких багов:

---

### 1. КРИТИЧНО: Неправильное имя storage bucket

**Проблема**: `process-polza-task` пишет в bucket `generation-results`, но такого bucket не существует. Реальный bucket — `generated-cards`.

```
ERROR [process-polza-task] Upload error: StorageApiError: Bucket not found
```

**Лог подтверждает**: Polza возвращает картинку (`https://s3.polza.ai/f/215000/...`), она скачивается, но upload в storage падает.

**Исправление**: Заменить `generation-results` → `generated-cards` в `process-polza-task/index.ts`. Также выровнять формат пути с `process-google-task` (`{userId}/{jobId}/{cardIndex}_{cardType}.png`).

---

### 2. Не обрабатывается статус `failed` при синхронном ответе Polza

**Проблема**: Когда Polza возвращает `status: failed` сразу (синхронно), код не обрабатывает это и передаёт ответ в `handleCompleted`, где падает с "No image generated".

```
No image URL in response: {"status":"failed","error":{"code":"BAD_GATEWAY"...}}
```

**Исправление**: Добавить проверку `if (mediaResult.status === 'failed')` перед вызовом `handleCompleted` в Phase 1.

---

### 3. Identify-product не роутится через Polza

**Проблема**: `GenerateCards.tsx` жёстко вызывает `'identify-product'` вместо `getIdentifyFunctionName(provider)`. При включённом Polza наименование товара всё равно определяется через прямой Gemini API.

**Исправление**: Использовать `getIdentifyFunctionName(provider)` в `GenerateCards.tsx`.

---

### 4. Analyze-style в unified-styling не роутится через Polza (частично)

**Проблема**: В оркестраторе, когда первая карточка завершена и вызывается `analyze-style` для стиля (строка ~295), вызывается `'analyze-style'` без проверки провайдера (хотя pre-analysis на строке 176 уже роутится правильно).

**Исправление**: Добавить проверку провайдера и для второго вызова analyze-style.

---

### 5. Саппорт-чат

**Статус**: Работает корректно. Код в `support-chat/index.ts` уже проверяет `api_provider` и при `polza` вызывает `polza.ai/api/v1/chat/completions`. Никаких ошибок в логах не обнаружено.

---

### 6. Описания (generate-description-polza)

**Статус**: Код выглядит корректно — использует `chat/completions`, background processing через `EdgeRuntime.waitUntil`. Нужно протестировать после деплоя.

---

### 7. Видео (create/check-video-job-polza)

**Статус**: Код выглядит корректно — создаёт задачу через Media API, сохраняет Polza ID в `kling_task_id`, polling через `check-video-status-polza`. Нужно протестировать.

---

### Файлы для изменения

| Файл | Что исправить |
|------|--------------|
| `supabase/functions/process-polza-task/index.ts` | Bucket `generated-cards`, формат пути, обработка `failed` статуса |
| `src/components/dashboard/GenerateCards.tsx` | Роутинг identify-product через провайдера |
| `supabase/functions/process-generation-tasks-banana/index.ts` | Роутинг analyze-style при unified-styling (строка ~295) |

### Порядок

1. Исправить bucket и обработку ошибок в `process-polza-task`
2. Добавить роутинг identify-product в GenerateCards
3. Исправить роутинг analyze-style в оркестраторе
4. Задеплоить и протестировать

