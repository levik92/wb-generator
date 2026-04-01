

## Прокси для прямых API-запросов генерации

### Что делаем

Добавляем в админку (раздел «Модель») блок управления HTTP-прокси. Когда прокси включён, все прямые запросы к Google Gemini API и другим провайдерам (кроме Polza AI) проходят через указанный прокси-сервер.

### Шаг 1. Миграция БД — добавить колонки прокси в `ai_model_settings`

```sql
ALTER TABLE ai_model_settings
  ADD COLUMN proxy_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN proxy_url text,
  ADD COLUMN proxy_username text,
  ADD COLUMN proxy_password text;
```

### Шаг 2. Новый компонент `AdminProxySettings.tsx`

Создать `src/components/admin/AdminProxySettings.tsx` — карточка с:
- Switch «Включить прокси»
- Поля: URL прокси (например `http://proxy.example.com:8080`), логин, пароль
- Кнопка «Сохранить»
- Предупреждение: «Не влияет на Polza AI»

Разместить в `PromptManager.tsx` рядом с `AdminImageSettings` на вкладке «Изображения».

### Шаг 3. Хелпер `fetchViaProxy` для Edge Functions

Создать утилиту, которую будут использовать все edge-функции с прямыми API-вызовами. Логика:
1. Читает `proxy_enabled`, `proxy_url`, `proxy_username`, `proxy_password` из `ai_model_settings`
2. Если прокси выключен — обычный `fetch()`
3. Если включён — делает `CONNECT` через прокси (Deno поддерживает `Deno.connect` для TCP-туннелирования) или использует HTTP-прокси через заголовок `Proxy-Authorization`

Вариант реализации: в Deno проще всего использовать переменные окружения `HTTP_PROXY` / `HTTPS_PROXY` которые Deno `fetch` подхватывает автоматически. Но так как настройки динамические (из БД), придётся использовать библиотеку типа `deno-fetch-proxy` или ручной CONNECT-туннель.

**Более простой подход**: использовать прокси как промежуточный URL. То есть вместо прямого запроса к `generativelanguage.googleapis.com`, отправлять запрос через прокси-URL с заголовками авторизации. Это стандартный HTTP forward proxy.

### Шаг 4. Модификация Edge Functions

Обновить следующие функции, добавив проверку прокси-настроек перед API-вызовами (только когда `api_provider !== 'polza'`):

- `process-google-task/index.ts` — функция `callGeminiApi()` 
- `generate-description-banana/index.ts` — вызов Gemini для описаний
- `analyze-style/index.ts` — анализ стиля
- `identify-product/index.ts` — идентификация товара
- `support-chat/index.ts` — AI-чат поддержки

В каждой функции:
1. Загрузить настройки прокси из `ai_model_settings`
2. Если `proxy_enabled === true` и текущий провайдер не Polza — проксировать запрос
3. Иначе — работать как раньше

### Шаг 5. Кеширование настроек

Чтобы не делать запрос в БД на каждый вызов, настройки прокси загружаются один раз в начале обработки задачи (в оркестраторе `process-generation-tasks-banana`) и передаются в процессор через параметры.

### Файлы

| Действие | Файл |
|---|---|
| Миграция | `ai_model_settings` — 4 новых колонки |
| Создать | `src/components/admin/AdminProxySettings.tsx` |
| Изменить | `src/components/dashboard/PromptManager.tsx` — добавить `AdminProxySettings` |
| Изменить | `supabase/functions/process-google-task/index.ts` — прокси в `callGeminiApi` |
| Изменить | `supabase/functions/generate-description-banana/index.ts` |
| Изменить | `supabase/functions/analyze-style/index.ts` |
| Изменить | `supabase/functions/identify-product/index.ts` |
| Изменить | `supabase/functions/process-generation-tasks-banana/index.ts` — передача настроек |

