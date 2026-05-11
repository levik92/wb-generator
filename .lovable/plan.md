## Цель

Добавить пользователю выбор формата (aspect ratio) генерируемых изображений на странице генерации карточек. По умолчанию — 3:4 (Wildberries / Ozon). Параметр прокидывается до Google Gemini и Polza AI (нанабанана), чтобы карточки можно было делать сразу под разные площадки (WB, сторис, Авито, баннеры и т.д.).

## UI на странице «Генерация карточек»

В блоке `Выбор типа карточек` (`src/components/dashboard/GenerateCards.tsx`) добавить новый под‑блок СРАЗУ ПОД пунктом «Единая стилизация» — последним внутри карточки.

Поведение:
- Выглядит как остальные «панели»: бордер, padding, такой же стиль, что у Unified Styling.
- Заголовок с иконкой (например, `Ratio` / `Frame`) и текстом «Формат изображения», справа — короткий бейдж с текущим значением (например `3:4`) и шеврон вниз.
- Клик по заголовку — раскрывает блок (используем существующий `Collapsible` из `@/components/ui/collapsible`, без сторонних зависимостей).
- Внутри развернутого блока — сетка из карточек‑опций (radio‑style, как чекбоксы выше): миниатюра пропорций (просто div с нужным `aspect-ratio` через inline style), название формата и подпись «для чего» (WB/Ozon, сторис, Reels, Авито, баннер и т.п.).
- При выборе — выделение бордером primary, как у выбранных типов карточек.
- Дизайн полностью на семантических токенах (`border`, `border-primary`, `bg-primary/5`, `text-muted-foreground`).
- Доступно всегда (не зависит от выбранных карточек и от unified styling).
- Во время генерации (`generating`) — disabled, как остальные контролы.

Список форматов (синхронизирован с тем, что реально поддерживают Gemini 3 Pro Image и Polza):

| value   | Подпись           | Назначение                                    |
|---------|-------------------|-----------------------------------------------|
| `3:4`   | 3:4 (по умолчанию)| Wildberries, Ozon — карточка товара           |
| `1:1`   | 1:1 квадрат       | Avito, Instagram пост, превью                 |
| `4:5`   | 4:5 портрет       | Instagram пост (вертикальный), Pinterest      |
| `9:16`  | 9:16 вертикаль    | Stories, Reels, TikTok, VK Клипы              |
| `16:9`  | 16:9 горизонталь  | Баннеры сайта, YouTube‑превью, презентации    |
| `4:3`   | 4:3 классика      | Универсальный горизонтальный формат           |
| `2:3`   | 2:3 портрет       | Постеры, Pinterest                            |
| `3:2`   | 3:2 альбом        | Фото, обложки                                 |

Состояние:
```ts
const [aspectRatio, setAspectRatio] = useState<string>('3:4');
```

При вызове генерации передаём `aspectRatio` в body вызова `createJobFunction` (рядом с `unifiedStyling`).

## Прокидывание параметра до моделей

1. Новая колонка в БД (миграция):
   - `generation_jobs.aspect_ratio text not null default '3:4'`.
   - Без ограничений CHECK (валидируем на бэке/в edge‑функции через whitelist).

2. `supabase/functions/create-generation-job-banana/index.ts`
   - Принимает `aspectRatio` в теле запроса.
   - Whitelist допустимых значений (см. таблицу выше). Если пришло что‑то иное — fallback `'3:4'`.
   - Сохраняет в `generation_jobs.aspect_ratio` при создании задачи.

3. `supabase/functions/process-generation-tasks-banana/index.ts`
   - Читает `aspect_ratio` из `job` и пробрасывает в `invokeBody` (`aspectRatio`) при вызове `process-google-task` / `process-polza-task`.

4. `supabase/functions/process-google-task/index.ts`
   - Принимает `aspectRatio` из тела запроса (fallback — читает `aspect_ratio` из `generation_jobs` по `task.job_id`, чтобы было устойчиво при ретраях).
   - Передаёт в `callGeminiApi` и подставляет в `generationConfig.imageConfig.aspectRatio` вместо хардкода `"3:4"`.

5. `supabase/functions/process-polza-task/index.ts`
   - Аналогично: принимает `aspectRatio` (fallback — из job).
   - Подставляет в `input.aspect_ratio` вместо хардкода `'3:4'`.

6. Регенерация / редактирование одной карточки (`regenerate-single-card-banana`, `edit-card-banana`) — берут `aspect_ratio` из исходного `generation_jobs` (по `source_job_id` / `job_id`) и используют то же значение, чтобы вариации/правки сохраняли формат исходного пакета. Изменений в UI не требуется.

## Что НЕ трогаем

- Логика стоимости токенов (стоимость одинаковая для всех форматов — у Gemini тариф не зависит от aspect ratio).
- Логика «Единой стилизации» (`analyze-style`) — она работает с описанием стиля, формат не влияет.
- Существующие незавершённые задачи — для них колонка получит дефолт `3:4`.
- Старые legacy функции `create-generation-job` / `process-generation-tasks` (без `-banana`) — они помечены как deprecated в памяти и не используются активной моделью.

## Технические детали

- Допустимые `aspectRatio` фиксируем в одном массиве в UI и зеркалим whitelist в edge‑функциях.
- В `process-google-task` уже есть нормализация `imageResolution` — добавим аналогичную `normalizeAspectRatio()`.
- Лог в `process-google-task`: дополнить строку `aspectRatio: ${ar}` вместо хардкоженной `3:4`.

## Затронутые файлы

- `src/components/dashboard/GenerateCards.tsx` — UI блока, состояние, передача `aspectRatio` в invoke.
- Миграция: добавить колонку `aspect_ratio` в `generation_jobs`.
- `supabase/functions/create-generation-job-banana/index.ts`
- `supabase/functions/process-generation-tasks-banana/index.ts`
- `supabase/functions/process-google-task/index.ts`
- `supabase/functions/process-polza-task/index.ts`
- `supabase/functions/regenerate-single-card-banana/index.ts`
- `supabase/functions/edit-card-banana/index.ts`
