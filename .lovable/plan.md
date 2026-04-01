

## Результаты проверки прокси

### Что работает

Прокси корректно подключён в 4 Edge Functions:
- **process-google-task** — генерация карточек (Google Gemini). Реализовано через отдельную функцию `createProxiedFetch()`, настройки подгружаются из БД
- **generate-description-banana** — генерация описаний (Google Gemini). Работает
- **analyze-style** — анализ стиля (Google Gemini). Работает
- **identify-product** — идентификация товара (Google Gemini). Работает

Админ-компонент `AdminProxySettings.tsx` создан и встроен в PromptManager.

### Баг в identify-product

В `identify-product/index.ts` (строка 55) переменная `supabase` используется **за пределами try-catch блока**, где она была объявлена (строка 36). Это вызовет **ReferenceError** при runtime — прокси-код не сможет выполниться. Клиент Supabase нужно создавать на верхнем уровне функции.

### Что НЕ покрыто прокси

| Функция | API | Прокси |
|---|---|---|
| `create-video-job` | Kling AI (klingai.com) | Нет |
| `check-video-status` | Kling AI (klingai.com) | Нет |
| `regenerate-video-job` | Kling AI (klingai.com) | Нет |
| `support-chat` | Google Gemini (direct mode) | Нет |

По плану видеогенерация (Kling) и чат поддержки должны тоже проходить через прокси при `proxy_enabled = true` и провайдере не-Polza.

### План исправлений

**Шаг 1. Исправить баг в `identify-product/index.ts`**
Вынести создание Supabase-клиента из try-catch наверх, чтобы прокси-код имел доступ к `supabase`.

**Шаг 2. Добавить прокси в `support-chat/index.ts`**
Загрузить настройки прокси из `ai_model_settings` и использовать `proxiedFetch` при `apiProvider === 'direct'` для вызовов Google Gemini.

**Шаг 3. Добавить прокси в видео-функции (Kling AI)**
- `create-video-job/index.ts` — обернуть вызов `fetch("https://api.klingai.com/...")` в proxiedFetch
- `check-video-status/index.ts` — аналогично
- `regenerate-video-job/index.ts` — аналогично

Во всех случаях — только при `proxy_enabled = true`, Polza-функции не трогаем.

**Шаг 4. Деплой обновлённых функций**

### Файлы

| Действие | Файл |
|---|---|
| Исправить | `supabase/functions/identify-product/index.ts` — баг с областью видимости supabase |
| Изменить | `supabase/functions/support-chat/index.ts` — добавить прокси для direct-режима |
| Изменить | `supabase/functions/create-video-job/index.ts` — прокси для Kling API |
| Изменить | `supabase/functions/check-video-status/index.ts` — прокси для Kling API |
| Изменить | `supabase/functions/regenerate-video-job/index.ts` — прокси для Kling API |

