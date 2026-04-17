

## Проблема

Цель `/promo/thanks` не засчитывается, хотя `/promo` работает. Причины могут быть две, и обе связаны с тем, что пользователь покидает страницу `/promo/thanks` **до** того, как Метрика успевает отправить хит/цель.

### Анализ

1. **Хит `/promo/thanks` уходит асинхронно**, а через пару секунд срабатывает `navigate('/auth?tab=register')` — React-роутер моментально размонтирует страницу, и `sendBeacon` Метрики может не успеть.
2. **Что важнее:** в `YandexMetrika.tsx` мы шлём `hit` и `reachGoal` **в одном тике** `useEffect`. Метрика батчит запросы — если хит ещё не подтверждён сервером, `reachGoal` может не привязаться к правильному визиту/странице. На `/promo` это не видно, потому что пользователь там остаётся надолго и беконы успевают долететь нормальным потоком.
3. На скриншоте network видно, что для `/promo` хит ушёл с полным `browser-info` и `t=...evs(...)` — это полноценный визит. Для `/promo/thanks` такого хита в логах нет — значит он либо не уходит, либо обрывается навигацией.

### Решение

Сделать три точечных изменения, которые гарантируют доставку:

**1. `src/components/YandexMetrika.tsx`** — для путей с целью отправлять `reachGoal` через `params.callback` хита, чтобы цель уходила **после** подтверждения хита Метрикой. Это официальный паттерн Яндекса для надёжной связки hit+goal.

```ts
const goal = ROUTE_GOALS[location.pathname];
window.ym(YM_COUNTER_ID, 'hit', url, {
  title: document.title,
  referer: document.referrer,
  callback: goal ? () => window.ym?.(YM_COUNTER_ID, 'reachGoal', goal) : undefined,
});
```

**2. `src/pages/PromoThanks.tsx`** — отправлять `reachGoal('promo_thanks_loaded')` **явно** прямо в `useEffect` страницы (помимо общего `YandexMetrika.tsx`). Дублирование безопасно: Метрика дедуплицирует одинаковые цели в рамках визита, но повышает шанс доставки. Плюс — увеличить таймер с 7 до 10 секунд, чтобы у `sendBeacon` гарантированно было время отправиться до навигации.

```ts
useEffect(() => {
  // ... существующий код
  if (typeof window.ym === 'function') {
    window.ym(105111303, 'reachGoal', 'promo_thanks_loaded');
  }
  // таймер 10 сек вместо 7
}, []);
```

**3. Перед `navigate('/auth?tab=register')`** — вызвать `reachGoal` ещё раз синхронно. Если цель ещё не доставлена, это последний шанс отправить её до размонтирования.

```ts
const goToAuth = () => {
  window.ym?.(105111303, 'reachGoal', 'promo_thanks_loaded');
  navigate('/auth?tab=register');
};
```

И использовать `goToAuth` и в авто-редиректе таймера, и в кнопке «Перейти сейчас».

### Что НЕ трогаем

- `index.html` — счётчик уже в SPA-режиме (`defer: true`), работает корректно.
- Конфигурацию цели в кабинете Метрики (она уже создана с идентификатором `promo_thanks_loaded`).
- Дизайн страницы.

### Файлы

- `src/components/YandexMetrika.tsx` — добавить `callback` в hit для маршрутов с целью.
- `src/pages/PromoThanks.tsx` — продублировать `reachGoal` в `useEffect`, увеличить таймер до 10 сек, обернуть навигацию в функцию `goToAuth` с финальным `reachGoal`.

### После публикации

Открыть `/promo/thanks` напрямую в новой вкладке с открытым Network → фильтр `mc.yandex`. Должны увидеть подряд три запроса: `tag.js` → `watch/...?page-url=...%2Fpromo%2Fthanks` → `watch/...?page-url=goal%3A%2F%2F...%2Fpromo_thanks_loaded`. В отчёте «Конверсии» данные появятся в течение часа.

