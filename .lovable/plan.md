# Проверка UTM-меток в Яндекс.Метрике на квизе, промо и Авито

## Что есть сейчас

- Счётчик Я.Метрики (ID `105111303`) подключён в `index.html` inline-скриптом без `defer`, поэтому **первый pageview уходит автоматически** с полным URL (включая `?utm_source=...&utm_medium=...&utm_campaign=...`).
- SPA-трекер `src/components/YandexMetrika.tsx` на каждом переходе шлёт `ym('hit', url)` — но url он собирает из `pathname + location.search + location.hash` **текущего роута**.
- Я.Метрика «приклеивает» UTM к визиту по первому хиту сессии, поэтому источник визита определится корректно. Но в отчётах по конкретным страницам (например `/quiz/thanks`) UTM в URL отсутствуют — там пусто.

## Проблемы

1. **UTM теряются при переходе на страницы «спасибо»**
   Во всех файлах (`Promo.tsx`, `PromoTwo.tsx`, `Avito.tsx`, `Quiz.tsx`) вызывается `navigate("/promo/thanks")` без проброса `location.search`. На thanks-страницах в URL нет `utm_*`, и Метрика регистрирует хит без меток.

2. **Цели (`reachGoal`) настроены только для `/promo` и `/promo/thanks`**
   В `ROUTE_GOALS` нет целей для:
   - `/promotwo`, `/promotwo/thanks`
   - `/avito`, `/avito/thanks`
   - `/quiz`, `/quiz/thanks`
   Значит конверсии в Метрике по этим страницам не фиксируются как отдельные цели.

3. **Переход с thanks → `/auth?tab=register`** тоже теряет UTM (важно для атрибуции регистраций по источникам в Метрике, хотя в БД UTM сохраняется через `useUtmTracking`).

## План правок

### 1. Сохранять UTM в URL при переходе на thanks-страницы
В `src/pages/Promo.tsx`, `PromoTwo.tsx`, `Avito.tsx`, `Quiz.tsx`:
- Брать `useLocation().search` и пробрасывать в `navigate`: `navigate({ pathname: "/quiz/thanks", search: location.search })`.

### 2. Сохранять UTM при переходе с thanks → /auth
В `PromoThanks.tsx`, `PromoTwoThanks.tsx`, `AvitoThanks.tsx`, `QuizThanks.tsx`:
- Считывать текущий `location.search` и добавлять `utm_*` к `/auth?tab=register&utm_source=...`.

### 3. Расширить `ROUTE_GOALS` в `YandexMetrika.tsx`
Добавить цели:
```
/promotwo         → promotwo_loaded
/promotwo/thanks  → promotwo_thanks_loaded
/avito            → avito_loaded
/avito/thanks     → avito_thanks_loaded
/quiz             → quiz_loaded
/quiz/thanks      → quiz_thanks_loaded
```

### 4. (Опционально) В SPA-хите явно прокидывать `params`
В `ym('hit', url, {...})` для thanks-страниц передавать `params: { utm_source, utm_medium, utm_campaign }` из `location.search`, чтобы в отчётах Метрики thanks-хит тоже был привязан к источнику, даже если пользователь перешёл по внутреннему `navigate`.

## Технические детали

- Файлы для правки:
  - `src/components/YandexMetrika.tsx` — расширить `ROUTE_GOALS`.
  - `src/pages/Promo.tsx`, `PromoTwo.tsx`, `Avito.tsx`, `Quiz.tsx` — пробрасывать `search` в `navigate`.
  - `src/pages/PromoThanks.tsx`, `PromoTwoThanks.tsx`, `AvitoThanks.tsx`, `QuizThanks.tsx` — пробрасывать `search` в `/auth`.
- После изменений новые цели нужно создать в самом интерфейсе Я.Метрики (тип «JavaScript-событие») с теми же идентификаторами, что в `ROUTE_GOALS`.

## Что НЕ меняем

- Логику `useUtmTracking` (сохранение визита в БД).
- Сам счётчик в `index.html` — он уже корректно ловит UTM на первом хите.
