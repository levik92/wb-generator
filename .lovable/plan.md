## Почему у некоторых не открываются картинки

Edge Functions при сохранении сгенерированной карточки делают:
```ts
supabase.storage.from('generated-cards').getPublicUrl(fileName)
```

Эта функция **внутри Supabase SDK** использует переменную окружения `SUPABASE_URL`, которая на сервере = `https://xguiyabpngjkavyosbza.supabase.co` (это внутренняя переменная Supabase, мы её не контролируем). В итоге в БД в колонку `image_url` записывается:

```
https://xguiyabpngjkavyosbza.supabase.co/storage/v1/object/public/generated-cards/...
```

Фронт получает этот URL из `generation_tasks.image_url` и пытается загрузить картинку **напрямую с supabase.co** — у пользователей из РФ, у которых заблокирован Supabase, картинка не открывается. Генерация работает (она идёт через прокси `api.wbgen.ru`), а отображение — нет.

То же самое будет с:
- `product-images` (фото товаров, загруженные пользователем — `getPublicUrl` на фронте сейчас тоже возвращает supabase.co, потому что ENV ещё не пересобран — но даже после пересборки старые записи в БД останутся со старым доменом)
- `support-attachments`, `service_friends_logos`, blog covers, видеообложки

## Решение

Переписывать домен на лету при чтении/формировании URL. Делать это в **двух местах**:

### 1. Фронт — единая утилита `rewriteStorageUrl`

В `src/lib/imageOptimization.ts` добавить функцию, которая заменяет любой `*.supabase.co/storage/v1/...` на `api.wbgen.ru/storage/v1/...`. Использовать её внутри уже существующей `optimizeStorageImage` — она применяется ко всем картинкам, проходящим через `ProgressiveImage` и thumb/preview helpers.

Это автоматически починит все старые записи в БД с захардкоженным `xguiyabpngjkavyosbza.supabase.co`.

### 2. Точечно для прямых `getPublicUrl` на фронте

Создать обёртку `getProxiedPublicUrl(bucket, path)` в `src/lib/storage.ts`:
```ts
export function getProxiedPublicUrl(bucket: string, path: string) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return rewriteStorageUrl(data.publicUrl);
}
```
И заменить `supabase.storage.from(...).getPublicUrl(...)` на эту обёртку в:
- `src/components/dashboard/GenerateCards.tsx` (загрузка product-images)
- `src/components/dashboard/VideoCovers.tsx`
- `src/components/admin/AdminSupport.tsx`
- `src/components/admin/AdminFriends.tsx`
- `src/components/admin/AdminBlog.tsx`
- `src/components/support/SupportChat.tsx`

### 3. Edge Functions — переписывать URL перед записью в БД

В edge functions, которые сохраняют `image_url` в `generation_tasks` / другие таблицы, добавить ту же замену домена перед `.update({ image_url: ... })`. Файлы:
- `supabase/functions/process-google-task/index.ts`
- `supabase/functions/process-openai-task/index.ts`
- `supabase/functions/process-polza-task/index.ts`
- `supabase/functions/process-generation-tasks/index.ts`
- `supabase/functions/regenerate-single-card/index.ts`

Создать общий helper `supabase/functions/_shared/storage-url.ts` с функцией `toProxiedUrl(url)` и брать домен прокси из переменной окружения (по умолчанию `https://api.wbgen.ru`).

### 4. Бэкфилл существующих записей в БД

Одна миграция: `UPDATE` для уже сохранённых ссылок в основных таблицах:
- `generation_tasks.image_url`, `storage_path`-производные колонки
- `generation_jobs.style_source_image_url`, любые `*_url` колонки
- `support_messages.attachment_url`, `blog_posts.cover_url`, `service_friends.logo_url` и т.п. — пройдусь по схеме и составлю полный список перед выполнением

Замена `https://xguiyabpngjkavyosbza.supabase.co/storage/` → `https://api.wbgen.ru/storage/`.

## Технические детали

- **Реверс-прокси**: убедитесь, что Caddy/Nginx проксирует `/storage/v1/object/public/*` (статика картинок, GET, без авторизации) и `/storage/v1/object/sign/*` (если когда-то будут signed URL). По логам видно — у вас `/storage/v1/` уже работает, иначе бы вообще никто не открыл.
- **CORS**: для `<img src=...>` CORS не требуется, поэтому проблем не должно быть. Но если включаете `crossorigin` атрибут — прокси должен возвращать `Access-Control-Allow-Origin: *` (Supabase Storage по умолчанию это делает, прокси должен пробросить заголовок).
- **Кэширование браузера**: после смены домена картинки перекачаются один раз — это ок.
- **Совместимость со старым доменом**: оставим прямые ссылки на `supabase.co` валидными (никаких редиректов), просто новые URL пойдут через прокси.

## Что сделаю после approval

1. `src/lib/imageOptimization.ts` — добавить `rewriteStorageUrl`, применить в `optimizeStorageImage`.
2. `src/lib/storage.ts` — новый файл с `getProxiedPublicUrl`.
3. Обновить 6 фронтовых файлов — заменить `getPublicUrl` на обёртку.
4. `supabase/functions/_shared/storage-url.ts` — новый shared helper.
5. Обновить 5 edge-функций — переписывать URL перед сохранением.
6. SQL-миграция: бэкфилл `image_url` и других URL-колонок (предварительно соберу полный список через схему БД).

После этого:
- Новые генерации сразу пишут URL через прокси.
- Старые записи перепишутся миграцией.
- Даже если что-то пропустим — фронтовая `optimizeStorageImage` всё равно перепишет домен на лету как защитный слой.

Нужен **Publish → Update** после изменений, чтобы новый бандл доехал до пользователей.