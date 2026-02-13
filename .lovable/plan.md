

# Генерация видеообложек через Kling AI

## Обзор

Добавляем полноценный раздел "Видеообложки" в дашборд. Пользователь загружает одно изображение товара (без сжатия, сохраняя качество), нажимает кнопку -- получает 5-секундное видео через Kling AI API (модель kling-v2-6, image-to-video, формат 3:4, без аудио). Стоимость -- 10 токенов (настраивается в админке). При ошибке токены возвращаются.

---

## Про ключи Kling AI

Kling использует JWT-аутентификацию (HS256):

- **Access Key (AK)** -- используется как `iss` (issuer) в JWT-токене. Это твой идентификатор.
- **Secret Key (SK)** -- используется для **подписи** JWT-токена. Это секрет.

Оба ключа нужны одновременно в edge function. Они будут сохранены как Supabase secrets:
- `KLING_ACCESS_KEY`
- `KLING_SECRET_KEY`

---

## Техническая реализация

### 1. Supabase Secrets

Добавить два секрета через интерфейс:
- `KLING_ACCESS_KEY` -- Access Key из Kling AI
- `KLING_SECRET_KEY` -- Secret Key из Kling AI

### 2. Миграция базы данных

**Таблица `video_generation_jobs`:**
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `status` (text: pending, processing, completed, failed)
- `product_image_url` (text) -- URL загруженного изображения
- `kling_task_id` (text) -- ID задачи в Kling API
- `video_url` (text, nullable) -- URL готового видео
- `error_message` (text, nullable)
- `tokens_cost` (integer, default 10)
- `prompt` (text) -- промт, отправленный в Kling
- `created_at`, `updated_at` (timestamptz)

RLS: пользователь видит/создаёт/обновляет только свои записи.

**Вставка в `generation_pricing`:**
- `price_type = 'video_generation'`, `tokens_cost = 10`, `description = 'Генерация видеообложки'`

**Вставка в `ai_prompts`:**
- `prompt_type = 'video_cover'`, `model_type = 'kling'`, `prompt_template = 'A smooth, cinematic product showcase animation with subtle camera movement...'`

### 3. Edge Functions

#### `create-video-job` (verify_jwt: true)
1. Проверяет авторизацию пользователя
2. Загружает стоимость из `generation_pricing` (тип `video_generation`)
3. Проверяет баланс токенов
4. Списывает токены
5. Загружает промт из `ai_prompts` (prompt_type = 'video_cover')
6. Генерирует JWT из AK + SK (HS256, exp = 30 мин)
7. POST на `https://api.klingai.com/v1/videos/image2video`:

```text
{
  model_name: "kling-v2-6",
  image: <URL изображения>,
  prompt: <промт из БД>,
  duration: "5",
  aspect_ratio: "3:4",
  mode: "std"
}
```

8. Сохраняет задачу в `video_generation_jobs`
9. Возвращает `job_id`

#### `check-video-status` (verify_jwt: true)
1. Получает `job_id`, проверяет принадлежность пользователю
2. Генерирует JWT
3. GET на `https://api.klingai.com/v1/videos/image2video/{task_id}`
4. Обновляет статус в БД
5. При ошибке -- **возвращает токены** пользователю (UPDATE profiles + INSERT token_transactions)
6. Возвращает статус и video_url

### 4. Фронтенд

#### Новый компонент `VideoCovers.tsx`
Простой интерфейс (по аналогии с GenerateCards, но значительно проще):
- Зона загрузки **одного** изображения (drag-and-drop), **без сжатия**
- Кнопка "Сгенерировать видеообложку" с отображением стоимости (10 токенов)
- Прогресс-блок с polling каждые 10 секунд:
  - Статусы: "Загрузка изображения...", "Создание задачи...", "Генерация видео...", "Готово!"
  - Предупреждение "Не закрывайте страницу" во время загрузки (как у карточек)
- Видеоплеер для просмотра результата (тег `<video>`)
- Кнопка скачивания видео
- История предыдущих генераций (последние 10)

#### Обновление Dashboard.tsx
- Добавить `'video'` в тип `ActiveTab`
- Добавить case в `renderContent()`:
  ```text
  case 'video':
    return <VideoCovers profile={profile} onTokensUpdate={refreshProfile} />;
  ```

#### Обновление DashboardSidebar.tsx
- Добавить пункт "Видеообложки" с иконкой `Video` между "Генерация карточек" и "Генерация описаний"

#### Обновление MobileSideMenu.tsx
- Аналогично добавить пункт "Видеообложки"

#### Обновление useGenerationPricing.ts
- Добавить `'video_generation'` в тип `PriceType`

#### Обновление Pricing.tsx
- Добавить строку с ценой видеогенерации рядом с фото и описаниями

### 5. Админ-панель

#### Обновление PromptManager.tsx
- Добавить верхний уровень табов: **"Изображения"** | **"Видео"**
- Вкладка "Изображения" -- текущий интерфейс (OpenAI / Gemini модели + промты)
- Вкладка "Видео":
  - Выбор модели (пока только Kling)
  - Редактируемый промт для видеогенерации (из `ai_prompts` с `prompt_type='video_cover'`)

#### AdminPricing.tsx
- Строка `video_generation` из `generation_pricing` отобразится автоматически (уже подтягивает все строки)

### 6. Обновление supabase/config.toml
```text
[functions.create-video-job]
verify_jwt = true

[functions.check-video-status]
verify_jwt = true
```

---

## Список файлов

**Новые:**
- `src/components/dashboard/VideoCovers.tsx`
- `supabase/functions/create-video-job/index.ts`
- `supabase/functions/check-video-status/index.ts`

**Изменяемые:**
- `src/pages/Dashboard.tsx` -- вкладка 'video'
- `src/components/dashboard/DashboardSidebar.tsx` -- пункт меню
- `src/components/mobile/MobileSideMenu.tsx` -- пункт меню
- `src/components/dashboard/PromptManager.tsx` -- табы Изображения/Видео
- `src/components/dashboard/Pricing.tsx` -- отображение цены видео
- `src/hooks/useGenerationPricing.ts` -- тип PriceType
- `supabase/config.toml` -- 2 новые функции

**Миграция БД:** таблица video_generation_jobs + данные pricing + промт

---

## Обработка ошибок

- Если Kling API возвращает ошибку при создании задачи -- токены возвращаются сразу в edge function
- Если при polling задача получает статус `failed` -- edge function возвращает токены и записывает причину в `error_message`
- На фронтенде показывается toast с текстом ошибки и информацией о возврате токенов

