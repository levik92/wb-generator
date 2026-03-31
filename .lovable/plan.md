

## Интеграция Polza AI как альтернативного провайдера

### Контекст

Сейчас все AI-вызовы идут напрямую в Google Gemini API и Kling API. Нужно добавить возможность переключения на провайдера Polza AI (`https://polza.ai/api/v1`), который является посредником и использует тот же формат OpenAI-совместимого API.

### Текущая архитектура (что вызывает какой API напрямую)

```text
process-google-task         → Gemini gemini-3-pro-image-preview (изображения карточек)
generate-description-banana → Gemini gemini-3.1-pro-preview (описания)
identify-product            → Gemini gemini-2.5-flash-lite (распознавание товара)
analyze-style               → Gemini gemini-3.1-flash-lite-preview (анализ стиля)
support-chat                → Lovable AI Gateway / gemini-3.1-pro-preview (чат поддержки)
create-video-job            → Kling API (видеообложки)
regenerate-video-job        → Kling API (перегенерация видео)
check-video-status          → Kling API (статус видео)
```

### Polza AI — ключевые отличия от прямого API

| Аспект | Прямой Gemini | Polza AI |
|--------|--------------|----------|
| Текст (описания, идентификация, чат) | `generativelanguage.googleapis.com` + API key в URL | `polza.ai/api/v1/chat/completions` + Bearer token |
| Изображения | Gemini generateContent с `responseModalities: ["IMAGE"]` | `polza.ai/api/v1/media` — Media API, асинхронный с polling |
| Видео (Kling) | `api.klingai.com` + JWT | `polza.ai/api/v1/media` с моделью Kling, асинхронный |
| Входные изображения | base64 inline в `parts` | `input.images: [{type: "url"/"base64", data: "..."}]` |
| Ответ изображений | base64 в response inline | URL на CDN Polza (хранение 7 дней) |

### План реализации

#### 1. Миграция БД — добавить поле `api_provider`

Добавить колонку `api_provider` (text, default `'direct'`) в таблицу `ai_model_settings`. Значения: `'direct'` (текущая работа) и `'polza'`.

#### 2. Секрет `POLZA_AI_API_KEY`

Добавить секрет в Supabase для API-ключа Polza.

#### 3. Новые Edge Functions (7 штук)

Каждая функция — зеркало существующей, но вызовы идут через Polza API. Промты берутся из той же таблицы `ai_prompts`, логика та же.

**Текстовые функции (через `/v1/chat/completions`):**

- **`process-polza-task`** — генерация изображений карточек. Использует Media API (`POST /v1/media`) с моделью `google/gemini-3-pro-image-preview`, `input.images` для фото товара, `input.aspect_ratio: "3:4"`, `input.image_resolution` из настроек. Результат — URL изображения. Polling через `GET /v1/media/{id}`.

- **`generate-description-polza`** — генерация описаний. `POST /v1/chat/completions` с моделью `google/gemini-3.1-pro-preview`. Промт тот же из `ai_prompts`.

- **`identify-product-polza`** — распознавание товара. `POST /v1/chat/completions` с моделью `google/gemini-2.5-flash-lite`. Изображение передаётся как `image_url` в content.

- **`analyze-style-polza`** — анализ стиля. `POST /v1/chat/completions` с моделью `google/gemini-3.1-flash-lite-preview`.

- **`support-chat-polza`** — не отдельная функция, а ветка внутри существующего `support-chat` (сейчас использует Lovable AI Gateway, добавим проверку провайдера и вызов Polza).

**Медиа функции (через `/v1/media`):**

- **`create-video-job-polza`** — создание видео. `POST /v1/media` с моделью Kling (например `kling-v2-6`), `input.prompt`, `input.images` с URL фото. Асинхронный — получаем `id`, далее polling.

- **`check-video-status-polza`** — проверка статуса видео. `GET /v1/media/{id}`. Маппинг статусов: `completed` → скачиваем видео, `failed` → возврат токенов.

- **`regenerate-video-job-polza`** — аналогично `create-video-job-polza`, но с логикой перегенерации.

#### 4. Обновить оркестратор `process-generation-tasks-banana`

Перед вызовом `process-google-task` — проверять `api_provider` из `ai_model_settings`. Если `'polza'` → вызывать `process-polza-task` вместо `process-google-task`.

#### 5. Обновить фронтенд-роутинг

- **`useActiveAiModel.ts`** — добавить поле `apiProvider: 'direct' | 'polza'` в возвращаемые данные. Добавить функцию `getProviderEdgeFunctionName()` для маппинга.

- **Вызовы видео** (`VideoCovers.tsx`, компоненты History) — при `polza` вызывать `create-video-job-polza` / `check-video-status-polza`.

- **Вызов `identify-product`** и **`analyze-style`** — аналогично, роутинг по провайдеру.

- **`generate-description`** — роутинг по провайдеру.

#### 6. Админ-панель — переключатель провайдера

В `PromptManager.tsx` (раздел «Управление моделями»):
- Добавить RadioGroup/Switch: «Прямое подключение (Direct API)» / «Польза AI (Polza)».
- Сохранение в `ai_model_settings.api_provider`.
- Визуально: отдельная карточка над текущим переключателем моделей.

#### 7. Обновить `AdminImageSettings.tsx`

При провайдере `polza` передавать `image_resolution` через параметр `input.image_resolution` в Media API (Polza поддерживает это нативно).

### Структура файлов

```text
Новые:
  supabase/functions/process-polza-task/index.ts
  supabase/functions/generate-description-polza/index.ts
  supabase/functions/identify-product-polza/index.ts
  supabase/functions/analyze-style-polza/index.ts
  supabase/functions/create-video-job-polza/index.ts
  supabase/functions/check-video-status-polza/index.ts
  supabase/functions/regenerate-video-job-polza/index.ts
  supabase/migrations/add_api_provider.sql

Изменяемые:
  src/hooks/useActiveAiModel.ts
  src/components/dashboard/PromptManager.tsx
  src/components/admin/AdminImageSettings.tsx
  src/components/dashboard/VideoCovers.tsx
  src/components/dashboard/GenerateCards.tsx
  src/components/dashboard/GenerateDescription.tsx
  supabase/functions/process-generation-tasks-banana/index.ts
  supabase/functions/support-chat/index.ts
```

### Важные технические детали

- **Media API асинхронный**: `POST /v1/media` возвращает `{id, status: "pending"}`. Нужен polling через `GET /v1/media/{id}` каждые 3-5 секунд до `completed`/`failed`. Это ключевое отличие от прямого Gemini API, который возвращает результат синхронно.

- **Изображения через URL**: Polza принимает `{type: "url", data: "https://..."}` — можно передавать URL из Supabase Storage напрямую, без скачивания и конвертации в base64. Это экономит память в Edge Functions.

- **Результат — URL, а не base64**: Polza возвращает URL на CDN. Нужно скачать и загрузить в Supabase Storage для постоянного хранения (CDN Polza хранит 7 дней).

- **Видео через Polza**: модель Kling доступна как `kling-v2-6` в Media API. Не нужен отдельный JWT — авторизация через единый `POLZA_AI_API_KEY`.

- **Промты**: используются те же из `ai_prompts`, без дублирования.

### Порядок реализации

Задача большая, рекомендую разбить на этапы:
1. Миграция + секрет + админ UI переключателя
2. Текстовые функции (описания, идентификация, стиль, чат)
3. Генерация изображений (process-polza-task + оркестратор)
4. Видео (create/check/regenerate)
5. Фронтенд роутинг

