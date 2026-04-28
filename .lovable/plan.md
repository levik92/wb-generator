# Переключение фронтенда на `https://api.wbgen.ru`

## Что меняем

Весь фронтенд сейчас стучится напрямую в `https://xguiyabpngjkavyosbza.supabase.co`. Меняем на `https://api.wbgen.ru` — ваш reverse-proxy в РФ. Edge Functions, Auth, Storage, Realtime и REST автоматически пойдут через прокси, потому что `supabase-js` строит все эндпоинты от `supabaseUrl`.

## Важно понимать

1. **Это build-time переменная.** Vite подставляет `VITE_SUPABASE_URL` в бандл во время сборки. Нельзя «поменять на лету» — нужен **Publish → Update** после правок, иначе у пользователей останется старый URL.
2. **`.env` в Lovable перезаписывается автоматически** из Supabase-интеграции. Поэтому надёжнее всего поменять **fallback** в `src/config/runtime.ts` — он сработает, даже если `.env` снова перезапишется. В `.env` тоже обновим для согласованности.
3. **Бэкенд НЕ трогаем:**
   - `supabase/config.toml` (`project_id = "xguiyabpngjkavyosbza"`) — остаётся как есть.
   - Миграции с pg_cron, которые вызывают `https://xguiyabpngjkavyosbza.supabase.co/functions/v1/...` — остаются (это серверный вызов внутри Supabase, прокси там не нужен и вреден).
   - Edge Functions и `_shared/runtime-config.ts` — не меняем.
4. **`src/integrations/supabase/types.ts`** — не редактируем (auto-generated).

## Список правок

### 1. `src/config/runtime.ts` — изменить fallback
```ts
export const supabaseUrl: string =
  import.meta.env.VITE_SUPABASE_URL || "https://api.wbgen.ru";
```
`supabaseProjectId` оставляем как есть — он используется только для имени ключа в localStorage (`sb-xguiyabpngjkavyosbza-auth-token`), менять нельзя, иначе у всех текущих пользователей слетит сессия.

### 2. `.env` — обновить значение
```
VITE_SUPABASE_URL="https://api.wbgen.ru"
SUPABASE_URL="https://api.wbgen.ru"
```
(Если Lovable перезапишет — fallback из п.1 страхует.)

### 3. `index.html` — preconnect/dns-prefetch на новый домен
Заменить две строки (строки 20 и 54) с `xguiyabpngjkavyosbza.supabase.co` на `api.wbgen.ru`. Это даст прирост к TTFB на первом запросе.

### 4. `vite.config.ts` — Workbox runtime cache
Сейчас правило кеша:
```js
urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i
```
Добавить второе правило для `api.wbgen.ru`, чтобы PWA-кеш продолжал работать:
```js
urlPattern: /^https:\/\/api\.wbgen\.ru\/.*/i,
handler: 'NetworkFirst',
options: { cacheName: 'api-proxy-cache', expiration: { maxEntries: 50, maxAgeSeconds: 604800 } }
```

### 5. `src/lib/imageOptimization.ts` — host hint для Storage
Сейчас:
```ts
const SUPABASE_HOST_HINT = 'supabase.co/storage/v1/object/public/';
```
Это используется, чтобы определять «свои» картинки и применять трансформации. После прокси картинки будут отдаваться с `api.wbgen.ru/storage/v1/...`. Добавим второй хинт, чтобы сохранить совместимость со старыми ссылками в БД:
```ts
const SUPABASE_HOST_HINTS = ['supabase.co/storage/v1/object/public/', 'api.wbgen.ru/storage/v1/object/public/'];
```
и обновим проверку `includes` на любую из строк.

## Проверка после деплоя

После **Publish → Update**:
1. Открыть DevTools → Network на `wbgen.ru`. Все запросы должны идти на `https://api.wbgen.ru/...` (auth, rest, storage, functions, realtime ws).
2. Проверить логин/регистрацию — токен сессии должен сохраниться (ключ `sb-xguiyabpngjkavyosbza-auth-token` остаётся прежним).
3. Сгенерировать карточку — Edge Functions должны отвечать через прокси.
4. Открыть историю — картинки из Storage загружаются через `api.wbgen.ru`.
5. Realtime (уведомления, чат поддержки) — WebSocket `wss://api.wbgen.ru/realtime/v1/...` должен апгрейдиться.

## Что должен пропускать ваш Caddy/Nginx

Убедитесь, что прокси проксирует **все** пути Supabase, а не только REST:
- `/auth/v1/*` — аутентификация
- `/rest/v1/*` — PostgREST
- `/storage/v1/*` — файлы (важно: большие изображения, нужен `client_max_body_size`/`request_body_size_limit` ≥ 10 МБ)
- `/functions/v1/*` — Edge Functions (долгие запросы — таймаут ≥ 9 минут под генерацию)
- `/realtime/v1/*` — WebSocket (`Connection: Upgrade`, `Upgrade: websocket`)
- Заголовки `apikey`, `Authorization`, `x-client-info` — пропускать без изменений
- CORS — лучше отдавать с **апстрима** (Supabase сам ставит правильные), прокси не должен их перезаписывать

## Откат

Если что-то сломается — вернуть в `src/config/runtime.ts` fallback на `https://xguiyabpngjkavyosbza.supabase.co`, обновить `.env`, `index.html`, `vite.config.ts`, `imageOptimization.ts` обратно и сделать Publish.

## Память

Сохраню новую memory `mem://infrastructure/regional-proxy-architecture` с зафиксированным доменом `api.wbgen.ru` и списком путей, которые должны проксироваться (обновление существующей записи).
