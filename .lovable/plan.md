

## Проблема

После деплоя фикса с `base64Decode` функция `process-google-task` падает с ошибкой **`Assignment to constant variable`** на строке 496. Переменная `generatedImageBase64` объявлена через `const` (строка 446), а мы пытаемся присвоить ей `null`.

Gemini успешно генерирует изображение, `base64Decode` корректно его декодирует, но краш происходит сразу после — перед загрузкой в Storage.

## Исправление

Один файл, одна строка.

**Файл: `supabase/functions/process-google-task/index.ts`**

Строка 446 — заменить `const` на `let`:

```typescript
// БЫЛО:
const generatedImageBase64 = aiData.candidates?.[0]?.content?.parts?.find(...)?.inlineData?.data;

// СТАЛО:
let generatedImageBase64 = aiData.candidates?.[0]?.content?.parts?.find(...)?.inlineData?.data;
```

Это позволит строке 496 (`generatedImageBase64 = null`) освободить память перед загрузкой в Storage. После деплоя текущая задача (Lavazza) должна успешно завершиться при следующем ретрае.

