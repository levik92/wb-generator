## Проблема

После недавних правок (storage / картинки) в production bundle жёстко зашит прямой адрес Supabase: `https://xguiyabpngjkavyosbza.supabase.co`. Поэтому ВСЯ фронтовая работа клиента `@supabase/supabase-js` (login, getSession, REST-запросы к таблицам, realtime, `supabase.functions.invoke`, `supabase.storage.getPublicUrl`) идёт напрямую на `.supabase.co`, который заблокирован Роскомнадзором. Без VPN пользователи в РФ не могут ни войти, ни запустить генерацию.

## Корневая причина

В файле `.env` сейчас:
```
SUPABASE_URL="https://api.wbgen.ru"             ← это для Edge Functions (Deno.env), фронт это НЕ читает
VITE_SUPABASE_URL="https://xguiyabpngjkavyosbza.supabase.co"   ← это читает Vite, и это пошло в bundle
```

`src/config/runtime.ts` корректно построен:
```ts
export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://api.wbgen.ru";
```
Но fallback срабатывает только когда переменная пустая. Сейчас она задана с прямым значением, поэтому fallback на прокси игнорируется.

Подтверждение: в `https://wbgen.ru/assets/index-*.js` лежит строка `tl="https://xguiyabpngjkavyosbza.supabase.co"` — клиент `createClient(tl, ...)` инициализируется именно ей.

Edge Functions, RPC и REST через прямой supabase.co с РФ IP без VPN не отвечают → у пользователя пустой ответ или таймаут → "не могу войти", "не работает генерация", хотя в `auth_logs` мы видим успешные логины только тех, у кого VPN или сговорчивый провайдер.

## План исправления

### 1. Поменять `VITE_SUPABASE_URL` обратно на прокси

В `.env` заменить:
```
VITE_SUPABASE_URL="https://xguiyabpngjkavyosbza.supabase.co"
```
на:
```
VITE_SUPABASE_URL="https://api.wbgen.ru"
```

`SUPABASE_URL` (без префикса `VITE_`) оставляем как есть — она для эдж-функций.

### 2. Защититься на будущее: fallback в коде

В `src/config/runtime.ts` сделать так, чтобы при попадании прямого `.supabase.co` в `VITE_SUPABASE_URL` он автоматически переписывался на прокси (на случай, если кто-то снова перезапишет .env или авто-инструмент Lovable Cloud вернёт прямой URL):

```ts
const raw = import.meta.env.VITE_SUPABASE_URL || "https://api.wbgen.ru";
export const supabaseUrl = /\.supabase\.co$/i.test(new URL(raw).hostname)
  ? "https://api.wbgen.ru"
  : raw;
```

Это страховка — даже если `.env` снова перезапишется, фронт всегда пойдёт через прокси.

### 3. Проверка после публикации

После деплоя:
- открыть `https://wbgen.ru/`, найти основной JS bundle и убедиться, что в нём НЕТ строки `xguiyabpngjkavyosbza.supabase.co` (только `api.wbgen.ru`);
- проверить вход и генерацию с РФ IP без VPN;
- убедиться, что Caddy/Nginx на `api.wbgen.ru` корректно проксирует не только `/storage/*`, но и `/auth/v1/*`, `/rest/v1/*`, `/realtime/v1/*`, `/functions/v1/*` (в логах уже видны успешные `/token`, `/user`, `/verify`, `/callback` через прокси — значит большинство путей уже настроено правильно).

## Что НЕ меняем

- Edge Functions (там `SUPABASE_URL` уже корректно настроена и не должна перезаписываться).
- Логика storage URL rewrite (`src/lib/storage.ts`, `supabase/functions/_shared/storage-url.ts`) — она правильная и нужна для старых записей в БД.
- Архитектуру «фронт через wb-gen.lovable.app + Caddy на wbgen.ru» — она работает, проблема только в одной env-переменной.

## Эффект

После исправления (1 строка в `.env` + 3-строчная защита в `runtime.ts`) и публикации bundle будет содержать `https://api.wbgen.ru` вместо `https://xguiyabpngjkavyosbza.supabase.co`. Российские пользователи смогут логиниться и пользоваться сервисом без VPN, как было раньше.