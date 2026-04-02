

## План: Восстановление очистки storage + ручное удаление файлов

### Проблема

1. **Cron-функция `cleanup_old_generations()`** удаляет только записи из БД, но не файлы из storage (регрессия миграции `20260214`). Оригинальная миграция (`20251125`) содержала `storage.delete_object()`, но для неправильного бакета (`generation-images` вместо `generated-cards`).

2. **Ручное удаление** в History.tsx удаляет только записи из `generations` / `video_generation_jobs`, но не файлы из бакетов `generated-cards` и `product-images`.

3. **Накопилось ~33 ГБ** файлов-сирот в storage.

### Что будет сделано

#### Шаг 1. SQL-миграция — обновить `cleanup_old_generations()`

Восстановить удаление файлов из storage перед удалением записей из БД:

```text
1. Собрать storage_path из generation_tasks для записей старше 1 месяца
2. Удалить файлы из бакета 'generated-cards' через storage.delete_object()
3. Собрать пути product-images из generation_jobs.product_images (JSONB)
4. Удалить файлы из бакета 'product-images' через storage.delete_object()
5. Удалить записи из таблиц (как сейчас)
```

Каждый вызов `storage.delete_object()` обёрнут в `EXCEPTION WHEN OTHERS` — сбой одного файла не блокирует остальные. Бакет `blog-images` не затрагивается.

#### Шаг 2. Одноразовая Edge Function `cleanup-old-storage`

Для очистки накопившихся ~33 ГБ файлов:
- Запрос к `storage.objects` для бакетов `generated-cards` и `product-images`, файлы старше 30 дней
- Удаление пакетами по 100 через Supabase Storage API
- Возврат количества удалённых файлов
- Защита: авторизация по service_role_key, `blog-images` не трогается
- Функцию можно удалить после однократного запуска

#### Шаг 3. Исправить ручное удаление в History.tsx

**`deleteGeneration()`** — перед удалением записи из `generations`:
1. Загрузить связанные `generation_jobs` и их `generation_tasks` с `storage_path`
2. Удалить файлы из `generated-cards` через `supabase.storage.from('generated-cards').remove(paths)`
3. Загрузить `product_images` из `generation_jobs` и удалить из `product-images`
4. Удалить записи `generation_tasks`, `generation_jobs`, затем `generations`

**`deleteVideoGeneration()`** — без изменений (видео хранятся на серверах Kling, не в нашем storage).

### Файлы

| Действие | Файл |
|---|---|
| Новая миграция | `supabase/migrations/xxx.sql` — обновлённая `cleanup_old_generations()` с правильными бакетами |
| Новая функция | `supabase/functions/cleanup-old-storage/index.ts` — одноразовая batch-очистка |
| Изменить | `src/components/dashboard/History.tsx` — добавить удаление storage-файлов при ручном удалении |

### Что НЕ меняется

- UI/дизайн/маршруты
- Бизнес-логика генерации
- Proxy/config/Polza изменения
- Другие Edge Functions
- Бакет `blog-images`
- `support-attachments` (у него своя функция очистки)

