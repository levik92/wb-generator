

## План: переключить Метрику в SPA-режим

### Проблема

Сейчас счётчик инициализируется без `defer:true`, значит `tag.js` сам отправляет автоматический хит при первой загрузке. Параллельно наш `YandexMetrika.tsx` пропускает первый хит (`isFirstHit`), полагая что автохит уже был. Это работает для первой страницы, но создаёт две проблемы:

1. На первой загрузке `/promo` Метрика фиксирует автоматический хит **до** того, как React-роутер смонтирует компонент и вызовет `reachGoal('promo_loaded')` — иногда в момент автохита `document.title` ещё дефолтный, и URL может уйти без правильного контекста. Цель `promo_loaded` при этом всё же срабатывает позже, но Метрика не всегда связывает её с тем же визитом, особенно если пользователь сразу уходит.
2. При SPA-навигации `/promo → /promo/thanks` мы шлём ручной `hit`, но автохит `tag.js` тут уже не работает — а наша логика «первый хит пропускаем» лишает первой страницы ручного хита, что иногда мешает Метрике корректно атрибутировать цель к визиту.

Официальная документация Яндекса для SPA прямо требует `defer: true` + ручной `hit` на каждое изменение страницы, включая первую. Это и нужно сделать.

### Что меняем

**1. `index.html` — инициализация счётчика**

Добавить `defer: true`. Убрать `ssr: true` (это серверный флаг, для клиентского SPA не нужен и в публичной доке Яндекса для SPA не упоминается). Убрать `referrer`/`url` из init (их передаём в `hit`).

```js
ym(105111303, 'init', {
  defer: true,
  webvisor: true,
  clickmap: true,
  ecommerce: 'dataLayer',
  accurateTrackBounce: true,
  trackLinks: true
});
```

**2. `src/components/YandexMetrika.tsx` — отправлять `hit` на КАЖДОЕ изменение маршрута, включая первое**

Убрать логику `isFirstHit`. Теперь при `defer:true` автохита нет — мы обязаны отправить хит сами на первой странице тоже. Сразу после `hit` дёргаем `reachGoal` для маршрутов из `ROUTE_GOALS`.

```ts
useEffect(() => {
  if (typeof window.ym !== 'function') return;
  const url = window.location.origin + location.pathname + location.search + location.hash;
  window.ym(YM_COUNTER_ID, 'hit', url, {
    title: document.title,
    referer: document.referrer,
  });
  const goal = ROUTE_GOALS[location.pathname];
  if (goal) window.ym(YM_COUNTER_ID, 'reachGoal', goal);
}, [location.pathname, location.search, location.hash]);
```

`ROUTE_GOALS` оставляем как есть (`/promo` → `promo_loaded`, `/promo/thanks` → `promo_thanks_loaded`).

### Что НЕ трогаем

- `<noscript>` пиксель в `<body>` — корректен.
- Конфигурацию целей в кабинете Метрики (это вне кода).
- Остальные страницы — они тоже выиграют, потому что теперь каждый SPA-переход даёт чистый `hit` с актуальным `document.title`.

### Файлы

- `index.html` — заменить объект init.
- `src/components/YandexMetrika.tsx` — убрать `isFirstHit`, слать `hit` всегда.

### После публикации

Нужно опубликовать сайт, затем зайти на `wbgen.ru/promo` и `wbgen.ru/promo/thanks` с открытой вкладкой Network → фильтр `mc.yandex`. Должны увидеть подряд: `watch/...?page-url=https%3A%2F%2Fwbgen.ru%2Fpromo` и `watch/...?page-url=goal%3A%2F%2Fwbgen.ru%2Fpromo_loaded`. Данные в отчёте «Конверсии» появятся в течение часа.

