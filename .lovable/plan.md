## Что не так сейчас

В `.env`:
```
VITE_SUPABASE_URL="https://xguiyabpngjkavyosbza.supabase.co"
```

Это значение попадает в `src/config/runtime.ts → supabaseUrl` и оттуда в `src/integrations/supabase/client.ts`. В итоге **весь Supabase-клиент фронта (auth, rest, realtime, functions, storage)** ходит напрямую на `xguiyabpngjkavyosbza.supabase.co`, который у российских пользователей заблокирован без VPN.

Прокси `api.wbgen.ru` уже полностью настроен и проверен (auth/health, rest, functions, storage отвечают корректно) — нужно просто переключить на него фронт.

## Изменение

Один файл, одна строка — `.env`:

```diff
- VITE_SUPABASE_URL="https://xguiyabpngjkavyosbza.supabase.co"
+ VITE_SUPABASE_URL="https://api.wbgen.ru"
```

Остальное трогать не нужно:
- `SUPABASE_URL` (без VITE_) уже = `https://api.wbgen.ru` — это для edge-функций/локальных скриптов.
- `VITE_SUPABASE_PUBLISHABLE_KEY` и `VITE_SUPABASE_PROJECT_ID` остаются прежними — ключ JWT привязан к проекту, а не к домену; project_id используется только как `storageKey` для `localStorage`.
- Google OAuth не трогаем (по запросу пользователя).

## Что произойдёт после изменения

- `supabase.auth.*` (login/signup/refresh) → пойдёт на `https://api.wbgen.ru/auth/v1/...` ✅
- `supabase.from(...).select()` → `https://api.wbgen.ru/rest/v1/...` ✅
- `supabase.functions.invoke(...)` → `https://api.wbgen.ru/functions/v1/...` ✅
- Realtime WebSocket → `wss://api.wbgen.ru/realtime/v1/websocket` ✅
- `supabase.storage.from(...).upload(...)` → `https://api.wbgen.ru/storage/v1/...` ✅
- Картинки и публичные URL — уже идут через прокси (через `optimizeStorageImage`/`getProxiedPublicUrl`).

## Деплой

После правки `.env` нужен **Publish → Update** в Lovable, чтобы новый бандл с правильным `VITE_SUPABASE_URL` уехал к пользователям. Без этого старый бандл с зашитым supabase.co остаётся в браузерах (но при первой загрузке нового JS перейдёт автоматически).

## Риски

Минимальные. Если прокси на каком-то пути отдаст некорректный ответ — клиент Supabase покажет ту же ошибку, что и раньше с прямым доменом. Откат — вернуть строку `VITE_SUPABASE_URL` к старому значению.
