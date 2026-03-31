

# Plan: Замыкание на Google AI Studio через `only`

## Проблема
Текущий параметр `provider: { order: [...], allow_fallbacks: true }` не блокирует автопулинг — Polza может отправить запрос другому провайдеру. Нужно использовать `only` (белый список) вместо `order`.

## Решение
Заменить во всех 5 файлах:
```json
"provider": {
  "order": ["Google AI Studio", "Google"],
  "allow_fallbacks": true
}
```
на:
```json
"provider": {
  "only": ["Google AI Studio"]
}
```

## Затронутые файлы

1. **`supabase/functions/analyze-style-polza/index.ts`** — строка ~74
2. **`supabase/functions/identify-product-polza/index.ts`** — строка ~76
3. **`supabase/functions/generate-description-polza/index.ts`** — строка ~143
4. **`supabase/functions/support-chat/index.ts`** — строка ~263
5. **`supabase/functions/process-polza-task/index.ts`** — строка ~203

Видео-функции (Kling) не трогаем — там Google AI Studio не подходит.

## Технические детали
Одинаковая замена 3 строк на 1 строку в каждом файле. Клиентский код не меняется.

