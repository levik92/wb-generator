

# Единая стилизация карточек — обновленный план

## Суть
При выборе 2+ типов карточек переключатель «Единая стилизация» становится доступным (по умолчанию включен). Сначала генерируется первая карточка, затем Gemini анализирует её стиль, и описание стиля добавляется в промты остальных карточек.

---

## 1. База данных — миграция

Добавить в `generation_jobs`:
- `unified_styling` boolean DEFAULT false
- `style_description` text NULL

Добавить промт в `ai_prompts`:
- `prompt_type = 'style-analysis'`, `model_type = 'technical'`
- Шаблон: инструкция для Gemini описать визуальный стиль изображения (цвета, шрифты, фоны, композиция, графические элементы) — кратко, в 3-5 предложениях

---

## 2. Фронтенд — `GenerateCards.tsx`

- Состояние `unifiedStyling` (boolean, default false)
- Под сеткой типов карточек (строка ~1869), **внутри** того же `CardContent`, добавить подблок:

```text
┌─────────────────────────────────────────────────┐
│  ✨ Единая стилизация                    [◯───] │
│  Стиль первой карточки будет применён           │
│  ко всем остальным для единообразия             │
└─────────────────────────────────────────────────┘
```

- Блок **всегда виден**, но при `selectedCards.length < 2` переключатель `disabled`, текст серый (`text-muted-foreground/50`, `opacity-50`)
- При `selectedCards.length >= 2` переключатель становится доступен и автоматически включается (если пользователь ранее не выключал вручную)
- Используется компонент `Switch` из `@/components/ui/switch`
- При генерации передавать `unifiedStyling: true/false` в edge function

---

## 3. Новая Edge Function — `analyze-style/index.ts`

- Принимает: `imageUrl`, `jobId`
- Загружает промт `style-analysis` из `ai_prompts` (model_type = 'technical')
- Скачивает изображение, конвертирует в base64
- Вызывает **Google Gemini API напрямую** (`gemini-3.1-flash-preview`) с ключом `GOOGLE_GEMINI_API_KEY` (уже есть в секретах)
- Возвращает текстовое описание стиля
- Сохраняет результат в `generation_jobs.style_description`

---

## 4. Изменения в `create-generation-job-banana`

- Принимать `unifiedStyling` из body
- Сохранять в `generation_jobs.unified_styling`

---

## 5. Изменения в `process-generation-tasks-banana` — ключевая логика

В функции `processTasks` (строка 132):

1. Проверить `job.unified_styling`
2. Если включено:
   - На первой итерации цикла: обработать только первую задачу (по `card_index`)
   - После успешного завершения первой задачи: получить `image_url` из БД
   - Вызвать `analyze-style` с URL готового изображения
   - Получить `styleDescription`, сохранить в `generation_jobs.style_description`
   - Продолжить обработку остальных задач как обычно
3. Если выключено — без изменений

В функции `processTask` (строка 326):
- В `getPromptTemplate`: если у job есть `style_description`, добавить к `benefits` (description) блок: `\n\nВАЖНО — единый стиль оформления: ${style_description}`

---

## 6. Перегенерация — `regenerate-single-card-banana` и `regenerate-single-card-v2`

- При создании задачи перегенерации: если в `description` есть `[sourceGenerationId:...]`, загрузить `style_description` из родительского job
- Если есть `style_description` — добавить к промту

---

## 7. Конфигурация — `supabase/config.toml`

```toml
[functions.analyze-style]
verify_jwt = false
```

---

## Порядок реализации

1. Миграция БД (колонки + промт)
2. `supabase/config.toml` — регистрация `analyze-style`
3. Edge function `analyze-style`
4. Обновить `create-generation-job-banana`
5. Обновить `process-generation-tasks-banana`
6. Обновить `regenerate-single-card-banana`
7. Фронтенд — переключатель в `GenerateCards.tsx`

## Файлы

| Файл | Действие |
|---|---|
| `src/components/dashboard/GenerateCards.tsx` | Переключатель UI + передача флага |
| `supabase/functions/analyze-style/index.ts` | Новая функция |
| `supabase/functions/create-generation-job-banana/index.ts` | Приём флага |
| `supabase/functions/process-generation-tasks-banana/index.ts` | Двухфазная логика |
| `supabase/functions/regenerate-single-card-banana/index.ts` | Подхват style_description |
| `supabase/config.toml` | Регистрация analyze-style |

