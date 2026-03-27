

## Проблема

Edge Function `process-google-task` крашится с "Memory limit exceeded" при декодировании base64 → бинарный. Проблема **не в модели** — Gemini успешно генерирует изображение, но `atob()` + `Uint8Array.from()` создаёт 3 копии данных в RAM, что превышает лимит 150МБ при больших изображениях.

Сегодня с 12:00 частота сбоев резко выросла — Gemini стал возвращать более тяжёлые изображения (нормальная вариативность), и функция перестала вписываться в лимит.

## Исправление

**Файл: `supabase/functions/process-google-task/index.ts`**

### 1. Добавить импорт `decode` из стандартной библиотеки Deno (строка 4)

```typescript
import { encode as base64Encode, decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
```

### 2. Заменить строку 494 — неэффективное декодирование

```typescript
// БЫЛО (3 копии в памяти):
const imageBlob = Uint8Array.from(atob(generatedImageBase64), c => c.charCodeAt(0));

// СТАЛО (1 копия, нативная функция Deno):
const imageBlob = base64Decode(generatedImageBase64);
```

### 3. Освободить память сразу после декодирования (после строки 494)

Обнулить ссылку на base64-строку в объекте ответа AI, чтобы GC мог освободить память до начала загрузки в Storage:

```typescript
// Очистка памяти перед загрузкой
generatedImageBase64 = null;
```

Одна функция, три строки изменений. После деплоя генерации должны перестать падать.

