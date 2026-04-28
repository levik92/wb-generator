## Проверка прокси и edge-функций для пользователей из РФ

### Что проверил

**Доступность:**
- `api.wbgen.ru` (прокси) — работает: storage 400 (норм без файла), auth 401 (норм), functions отвечают
- `wbgen.ru` (фронт) — 200 OK
- Edge Functions за последние сутки — все ответы 200, ошибок 4xx/5xx нет

**Критическая проблема найдена:** За последние 7 дней в БД сохранено **19 image_url, указывающих напрямую на `xguiyabpngjkavyosbza.supabase.co`** вместо `api.wbgen.ru`. Это значит, что у пользователей из РФ эти карточки **не загрузятся** (Supabase заблокирован у части провайдеров).

Источник проблемы — функция `process-polza-task` (последняя запись 28.04.2026 22:06): несмотря на корректный код (`toProxiedUrl(rawUrl)` на строке 344), в БД пишутся прямые URL. Также обнаружено: `process-google-task`, `process-openai-task`, `regenerate-single-card`, `process-generation-tasks` уже используют `toProxiedUrl` — но 19 свежих "битых" записей пришли именно через polza-роут (job `2687b360` обработан polza-провайдером с моделью google).

Вероятная причина — функция была задеплоена в старой версии до фикса прокси-обёртки (или env-переменная `STORAGE_PROXY_HOST` установлена в пустую строку, что отключает дефолт).

**Хорошие новости:**
- `video_generation_jobs.product_image_url` — все 15 записей через прокси
- `generation_jobs.style_source_image_url` — все 5 через прокси
- `generation_tasks.image_url` — 1631 из 1650 через прокси (ОК), но 19 свежих — мимо

### Что сделать

1. **Передеплой `process-polza-task`** — чтобы текущая версия с `toProxiedUrl` точно работала на проде. Параллельно передеплоить `process-google-task`, `process-openai-task`, `regenerate-single-card`, `regenerate-single-card-banana`, `process-generation-tasks-banana` для надёжности.

2. **Защитный fallback в БД** — миграция: триггер `BEFORE INSERT/UPDATE` на `generation_tasks.image_url`, `video_generation_jobs.result_video_url`, `video_generation_jobs.product_image_url`, `generation_jobs.style_source_image_url`, который автоматически переписывает `*.supabase.co/storage/v1/...` → `api.wbgen.ru/storage/v1/...`. Это страховка от любых будущих регрессий — даже если разработчик забудет вызвать `toProxiedUrl`, БД исправит.

3. **Одноразовый бэкфилл** — UPDATE-запрос, заменяющий все исторические `xguiyabpngjkavyosbza.supabase.co` на `api.wbgen.ru` в указанных колонках, чтобы старые карточки тоже открывались у пользователей из РФ.

4. **Smoke-тест после деплоя** — сгенерировать 1 карточку через Polza и убедиться, что свежий `image_url` начинается с `https://api.wbgen.ru/`.

### Технические детали

Триггер (концепт):
```sql
create or replace function public.rewrite_storage_url_to_proxy()
returns trigger language plpgsql as $$
begin
  if NEW.image_url is not null and NEW.image_url ~ 'https?://[a-z0-9-]+\.supabase\.co/storage/v1/' then
    NEW.image_url := regexp_replace(NEW.image_url, 'https?://[a-z0-9-]+\.supabase\.co', 'https://api.wbgen.ru');
  end if;
  return NEW;
end$$;
```
(аналогичные функции/триггеры на video_generation_jobs и др. колонки)

Бэкфилл:
```sql
update generation_tasks
set image_url = regexp_replace(image_url, 'https?://[a-z0-9-]+\.supabase\.co', 'https://api.wbgen.ru')
where image_url ~ 'supabase\.co/storage/v1/';
```

### Что НЕ будет тронуто

- `index.css`, UI компоненты — без изменений
- Логика генерации/биллинга — без изменений
- Таблицы аутентификации/storage — без изменений

После одобрения переключусь в build-режим, выкачу миграцию и передеплой.