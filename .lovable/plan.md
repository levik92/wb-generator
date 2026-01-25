
## Анализ проблемы

Изучив код и документацию Google Gemini API, я обнаружил **причину снижения качества изображений**:

### Текущее состояние

В функции `process-google-task/index.ts` (строки 103-108) запрос к Google Gemini API отправляется **без параметра `config`**:

```typescript
body: JSON.stringify({
  contents: [{
    parts: contentParts
  }]
  // ← Отсутствует config с параметрами разрешения!
})
```

Это приводит к тому, что API использует **разрешение по умолчанию (1K)**, что объясняет снижение размера файлов с ~2MB до ~1MB.

### Решение

Согласно документации Google Gemini API, для указания разрешения нужно добавить объект `config` с параметром `image_size`:

```typescript
{
  "contents": [{ "parts": [...] }],
  "config": {
    "image_config": {
      "image_size": "2K",  // Поддерживаются: "1K", "2K", "4K"
      "aspect_ratio": "9:16"  // Для карточек WB
    }
  }
}
```

---

## План реализации

### 1. Обновление базы данных

Добавить колонку `image_resolution` в таблицу `ai_model_settings`:
- Значения: `1K`, `2K`
- По умолчанию: `2K`

```sql
ALTER TABLE ai_model_settings 
ADD COLUMN image_resolution TEXT DEFAULT '2K' 
CHECK (image_resolution IN ('1K', '2K'));
```

### 2. Обновление Edge Function `process-google-task`

Модифицировать функцию `callGeminiApi` для передачи параметра разрешения:

```typescript
async function callGeminiApi(
  apiKey: string,
  contentParts: any[],
  keyName: string,
  imageResolution: string = '2K'  // Новый параметр
): Promise<...> {
  // ...
  body: JSON.stringify({
    contents: [{ parts: contentParts }],
    config: {
      image_config: {
        image_size: imageResolution,  // "1K" или "2K"
        aspect_ratio: "9:16"
      }
    }
  })
}
```

Также добавить получение настройки из БД перед генерацией:

```typescript
const { data: modelSettings } = await supabase
  .from('ai_model_settings')
  .select('image_resolution')
  .order('updated_at', { ascending: false })
  .limit(1)
  .single();

const resolution = modelSettings?.image_resolution || '2K';
```

### 3. Обновление Admin Panel

Добавить переключатель разрешения в настройках модели (`AdminPricing.tsx` или отдельная секция):

```text
┌─────────────────────────────────────────────┐
│ ⚙️ Настройки генерации изображений          │
├─────────────────────────────────────────────┤
│ Разрешение:  ○ 1K (быстрее, меньше размер)  │
│              ● 2K (выше качество)            │
│                                             │
│ Примечание: Стоимость API одинакова для     │
│ обоих разрешений                            │
└─────────────────────────────────────────────┘
```

### 4. Обновление других Edge Functions

Применить те же изменения к функциям, использующим Google Gemini API:
- `regenerate-single-card-banana` (вызывает `process-google-task`)
- `edit-card-banana` (вызывает `process-google-task`)

Поскольку эти функции используют `process-google-task`, изменения будут применены автоматически.

---

## Файлы для изменения

| Файл | Изменения |
|------|-----------|
| **Миграция БД** | Добавить колонку `image_resolution` |
| `supabase/functions/process-google-task/index.ts` | Добавить параметр `config.image_config.image_size` |
| `src/components/admin/AdminPricing.tsx` или новый компонент | UI для выбора разрешения |

---

## Ожидаемый результат

После реализации:
- Изображения будут генерироваться в разрешении **2K** по умолчанию
- Размер файлов вернется к ~2MB
- Качество изображений улучшится
- Администратор сможет переключаться между 1K и 2K в админ-панели
