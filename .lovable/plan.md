
Проблема подтверждена: прямой `DELETE FROM storage.objects ...` не сработает в этом проекте, потому что Supabase блокирует такие удаления триггером `storage.protect_delete()`. То есть файлы этим SQL-запросом не удалялись.

Что видно сейчас по проекту:
- В Storage реально остаются старые изображения:
  - `generated-cards`: 13 311 файлов старше 30 дней, около 26 GB
  - `product-images`: 5 300 файлов, около 3042 MB
  - `generation-images`: 79 файлов, около 135 MB
- Видео сейчас не хранятся в Supabase Storage: в коде используются внешние `result_video_url`.
- Описания тоже не лежат в Storage: они берутся из `generations.output_data.description`.

План исправления

1. Переделать разовую очистку `cleanup-old-storage`
- Не удалять через SQL и не обходить bucket только через `.list()`.
- Брать список старых объектов через `SELECT` из `storage.objects`, а удалять только через Storage API: `supabase.storage.from(bucket).remove(paths)`.
- Удалять батчами до 1000 объектов за вызов.
- Добавить все нужные bucket’ы: `generated-cards`, `product-images`, `generation-images`.
- Возвращать прогресс: `deleted`, `remaining`, `has_more`.

2. Исправить архитектурную причину, почему текущая edge function не дочищает storage
- Сейчас она режет выполнение примерно после 100 удалений.
- Она ненадежно работает с вложенными путями и legacy-структурой файлов.
- После переделки очистка будет идти по реальным именам объектов, а не по попыткам “угадать” структуру папок.

3. Проверить ежедневную автоочистку
- Отдельно проверить, работает ли текущая SQL-функция `public.cleanup_old_generations()` с `storage.delete_object(...)`.
- Если на этом проекте она тоже конфликтует с защитой Storage, вынести удаление файлов из SQL и оставить в SQL только очистку БД, а файлы чистить edge function через Storage API.

4. Довести ручное удаление в `History.tsx`
- Оставить удаление через `supabase.storage.remove(...)`, но начать проверять ошибки удаления.
- Не показывать “успешно удалено”, если storage-файлы не удалились.
- При необходимости расширить поддержку legacy-путей для старых изображений.

Технически нужно менять:
- `supabase/functions/cleanup-old-storage/index.ts`
- возможно новую миграцию для корректировки `public.cleanup_old_generations()`
- `src/components/dashboard/History.tsx`

Что не нужно чистить в Storage:
- видеофайлы — они не лежат в Supabase Storage по текущей реализации;
- описания — они хранятся в БД, а не в bucket’ах;
- `blog-images` и `support-attachments` не затрагиваем.

Ожидаемый результат после реализации:
- 0 файлов старше 30 дней в `generated-cards`, `product-images`, `generation-images`;
- без прямых SQL-удалений из `storage.objects`;
- без повторного накопления устаревших image-файлов.
