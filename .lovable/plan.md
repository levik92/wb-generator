

# Функция «В таком же стиле» — реализация

## Что делаем

Кнопка Sparkles возле каждой сгенерированной карточки. По клику — ResponsiveDialog (Drawer на мобилке, Dialog на ПК) с:
- Превью исходной карточки
- Чекбоксы типов карточек (без типа текущей)
- Поле описания + Switch «Придумай сам» (вкл. по умолчанию → поле заблокировано, заполнено оригинальным описанием из jobData)
- Кнопка «Создать N карточек — X токенов» (стоимость: 5 токенов за карточку, как обычная генерация)

## Техническая логика

1. Пользователь нажимает Sparkles у карточки → открывается попап
2. Выбирает типы карточек, при необходимости пишет своё описание (или оставляет «Придумай сам»)
3. По кнопке «Создать»:
   - Берутся `productName`, `productImages` из `jobData` (сохранённые при генерации)
   - `description` — из поля попапа (новое или оригинальное)
   - Вызывается `create-generation-job-banana` с `unifiedStyling: true` и новым параметром `styleSourceImageUrl` (URL выбранной карточки)
   - Бэкенд: `process-generation-tasks-banana` при наличии `style_source_image_url` в job вызывает `analyze-style` с этим URL вместо первой сгенерированной карточки, и применяет стиль ко ВСЕМ карточкам (не пропускает первую)

## Файлы для изменения

### 1. Миграция БД
- Добавить колонку `style_source_image_url TEXT` в `generation_jobs`

### 2. `supabase/functions/create-generation-job-banana/index.ts`
- Принять параметр `styleSourceImageUrl` из body
- Сохранить в `generation_jobs.style_source_image_url`

### 3. `supabase/functions/process-generation-tasks-banana/index.ts`
- Если `job.style_source_image_url` есть → вызвать `analyze-style` с этим URL сразу (не ждать первую карточку), применить стиль ко всем задачам
- Изменить логику: `styleAnalysisDone = !job.unified_styling` → если есть `style_source_image_url`, то сразу анализировать стиль до обработки задач

### 4. `src/components/dashboard/GenerateCards.tsx`
- Добавить состояния: `styleDialogOpen`, `styleSourceImage`, `styleSelectedCards`, `styleDescription`, `styleAutoDescription`
- Кнопка Sparkles в ряду кнопок (между Edit и Regenerate), фиолетовая обводка
- Компонент попапа — ResponsiveDialog с чекбоксами, полем описания, Switch «Придумай сам»
- Функция `generateInStyle()`:
  - Использует `jobData` для productName, productImages
  - Вызывает `create-generation-job-banana` с `styleSourceImageUrl`, `unifiedStyling: true`, выбранными карточками
  - Запускает polling (`startJobPolling`)
  - Стоимость: `selectedCards.length * photoGenerationPrice` (5 токенов за карточку)

