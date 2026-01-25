

## Изменение формата изображения на 3:4

### Текущее состояние

В файле `supabase/functions/process-google-task/index.ts` (строка 112) формат изображения задан как `"9:16"`:

```typescript
imageConfig: {
  imageSize: imageResolution,  // "1K" or "2K"
  aspectRatio: "9:16"  // ← Текущее значение
}
```

### План изменений

**Файл:** `supabase/functions/process-google-task/index.ts`

**Изменение:** Заменить `aspectRatio: "9:16"` на `aspectRatio: "3:4"`

```typescript
imageConfig: {
  imageSize: imageResolution,  // "1K" or "2K"
  aspectRatio: "3:4"  // ← Новое значение
}
```

### Результат

После изменения все сгенерированные карточки будут иметь соотношение сторон 3:4 (например, 1536×2048 пикселей при разрешении 2K).

