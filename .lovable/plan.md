

# Plan: Настройка приоритета провайдера Google AI Studio в Polza AI

## Суть
Polza AI поддерживает параметр `provider` с полем `order` — массив провайдеров в порядке приоритета. Если первый недоступен, запрос идет ко второму. На странице модели `google/gemini-3.1-flash-lite-preview` видно два провайдера: **"Google AI Studio"** и **"Google"**. Приоритет ставим на "Google AI Studio", фолбэк на "Google".

## Параметр для всех chat/completions запросов
```json
"provider": {
  "order": ["Google AI Studio", "Google"],
  "allow_fallbacks": true
}
```

## Параметр для media запросов (генерация изображений)
Тот же формат — Polza Media API также поддерживает `provider`.

## Видео (Kling)
Модель `kling-v2-6` — это не Google-модель, провайдер Google AI Studio её не обслуживает. Для видео-функций **provider НЕ добавляем** — оставляем автопулинг, чтобы Polza сама выбрала нужный провайдер для Kling.

## Затронутые файлы (5 штук)

### 1. `supabase/functions/analyze-style-polza/index.ts`
В `JSON.stringify()` body запроса к `/chat/completions` добавить `provider: { order: ["Google AI Studio", "Google"], allow_fallbacks: true }`.

### 2. `supabase/functions/identify-product-polza/index.ts`
Аналогично — добавить `provider` в body запроса к `/chat/completions`.

### 3. `supabase/functions/generate-description-polza/index.ts`
Добавить `provider` в body запроса к `/chat/completions`.

### 4. `supabase/functions/support-chat/index.ts`
В ветке `apiProvider === 'polza'` (строка ~256-263) — добавить `provider` в body. Также добавить `model` (сейчас отсутствует в Polza-ветке).

### 5. `supabase/functions/process-polza-task/index.ts`
В body запроса к `/media` (строка ~195-203) — добавить `provider`.

### НЕ затрагиваем:
- `create-video-job-polza/index.ts` — модель Kling, провайдер Google не подходит
- `regenerate-video-job-polza/index.ts` — модель Kling, аналогично
- GET-запросы проверки статуса (`/media/{id}`)

## Технические детали

Изменение одинаковое во всех 5 файлах — добавление поля `provider` в JSON body fetch-запроса. Клиентский код и база данных не затрагиваются. Деплой Edge Functions автоматический.

