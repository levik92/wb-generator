

# План: устранение дублей событий и стабилизация Метрики

## Проблемы, которые я нашёл при анализе кода

### 1. Дубль `promo_loaded` при заходе на `/promo` (двойная отправка)

В `Promo.tsx` цель `promo_loaded` отправляется **дважды на одном и том же монтировании**:
- В `useEffect` страницы (строка 44): `void reachGoal("promo_loaded")` — «safety net».
- В `YandexMetrika.tsx` (строка 60–61): на первом рендере для `/promo` тоже срабатывает `reachGoal("promo_loaded")` через `ROUTE_GOALS`.

Итог: Метрика получает **2 одинаковых события `reachGoal=promo_loaded`** за один визит → в отчётах конверсия завышена и выглядит «странно».

### 2. Тройной дубль `promo_thanks_loaded` при переходе с `/promo` на `/promo/thanks`

В `PromoThanks.tsx` цель отправляется **трижды**:
- В `YandexMetrika.tsx` `useEffect` на смену роута → `hit` + `reachGoal("promo_thanks_loaded")` (строка 76).
- В `useEffect` самой страницы (строка 26): `void reachGoal(PROMO_THANKS_GOAL)` — «safety net».
- В коллбэке таймера через 10 сек (строка 32): снова `reachGoal(PROMO_THANKS_GOAL)` перед навигацией.

Если пользователь нажмёт «Перейти сейчас» — добавится **четвёртый** вызов из `goToAuth`. Все они уйдут.

### 3. Дубль `promo_loaded` при клике на CTA

В `Promo.tsx` обработчик `goToThanks` вызывает `await reachGoal("promo_loaded")` ещё раз перед навигацией (строка 54), хотя цель уже была отправлена при загрузке страницы. Это **логически некорректно**: цель «promo_loaded» = «страница промо загружена», а не «клик по кнопке». Должна срабатывать ровно один раз.

### 4. Дубль PageView в Meta Pixel

В `index.html` строка 51 вызывается `fbq('track', 'PageView')` при первой загрузке. А `MetaPixel.tsx` шлёт `PageView` в `useEffect` на каждое изменение роута, **включая первый рендер** (нет защиты `isFirstRender`). Итог: на первой загрузке любой страницы PageView в Meta уходит **дважды**.

## Решение

### A. Убрать дубли отправки целей Метрики

**`src/pages/Promo.tsx`:**
- Удалить вызов `void reachGoal("promo_loaded")` из `useEffect` (стр. 44) — за это уже отвечает `YandexMetrika.tsx`.
- В `goToThanks` убрать `await reachGoal("promo_loaded")` — цель уже отправлена при монтировании. Достаточно просто `navigate("/promo/thanks")`.

**`src/pages/PromoThanks.tsx`:**
- Удалить «safety net» вызов `void reachGoal(PROMO_THANKS_GOAL)` из `useEffect` (стр. 26).
- Убрать `await reachGoal(PROMO_THANKS_GOAL)` из обработчика таймера (стр. 32) и из `goToAuth` (стр. 16) — `YandexMetrika.tsx` уже отправил цель при монтировании страницы.

После этих правок каждая цель будет отправляться **ровно один раз** при первом попадании на страницу — централизованно через `YandexMetrika.tsx`.

### B. Защитить Meta Pixel от дубля PageView на первом рендере

**`src/components/MetaPixel.tsx`:**
- Добавить `useRef(true)` флаг как в `YandexMetrika.tsx` и пропускать первый `useEffect`-вызов, потому что инлайн-код в `index.html` уже отправил `PageView`. Шлём только на SPA-переходах.

### C. Дополнительная стабильность

**`src/components/YandexMetrika.tsx`:**
- Текущая логика «первый рендер не шлёт `hit`, но шлёт `reachGoal` для маршрута» — корректна (хит уже отправлен инлайн-кодом, а кастомные цели — нет). Логику не трогаем.
- `reachGoal` через официальный `ym('reachGoal', goal, {callback})` с фоллбэк-таймаутом 500мс — оставляем как есть. После удаления дублей навигация не «обгонит» отправку, потому что в кнопках перехода больше не будет лишнего `await reachGoal`, и React не размонтирует страницу до того, как ym() поставит запрос в очередь (хит ушёл при монтировании, у браузера было время).

## Файлы к изменению

1. **`src/pages/Promo.tsx`** — убрать `reachGoal` из `useEffect` и из `goToThanks`.
2. **`src/pages/PromoThanks.tsx`** — убрать `reachGoal` из `useEffect`, из таймера и из `goToAuth`.
3. **`src/components/MetaPixel.tsx`** — добавить `useRef`, пропустить первый рендер.

## Что НЕ трогаем

- `index.html` (Метрика и Meta Pixel инициализируются корректно).
- `YandexMetrika.tsx` (центральная логика правильная).
- Дизайн страниц `/promo` и `/promo/thanks`.
- Логику счётчика 10 секунд.

## Как проверить после деплоя

1. Incognito → `/promo` → DevTools → Network → фильтр `mc.yandex`. Должен быть **1 хит** + **1 reachGoal=promo_loaded**.
2. Кликнуть «Попробовать бесплатно» → переход на `/promo/thanks` → **1 хит** + **1 reachGoal=promo_thanks_loaded**.
3. Дождаться авто-перехода (или нажать «Перейти сейчас») → переход на `/auth`. Доп. событий цели быть не должно.
4. Фильтр `facebook.com/tr` → на каждой странице **ровно 1 PageView**, не 2.
5. В кабинете Метрики через ~30 минут число конверсий по `promo_loaded` и `promo_thanks_loaded` должно совпадать с числом уникальных визитов на эти страницы.

