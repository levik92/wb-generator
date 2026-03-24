

# Оптимизация скорости загрузки

## Обнаруженные проблемы

1. **Дашборд загружает ВСЕ вкладки сразу** — 12+ компонентов импортируются при открытии, хотя видна только одна вкладка
2. **framer-motion (~30KB)** загружается на каждой странице, даже для простых анимаций
3. **SupportWidget** грузится на всех публичных страницах
4. **AuthRedirect** делает async-запрос к Supabase перед показом лендинга даже для новых посетителей
5. **DashboardSidebar** дублирует запрос `getUser()`, который уже делает родитель

## План оптимизации

### Шаг 1: Ленивая загрузка вкладок дашборда
Все 12 компонентов вкладок в `Dashboard.tsx` перевести на `React.lazy()`. Загружается только активная вкладка.

### Шаг 2: CSS-анимации вместо framer-motion
В критических компонентах (`SupportWidget`, `DashboardPageWrapper`, `CasesPromoBanner`) заменить `motion.div` на CSS `@keyframes`. Убирает framer-motion из начальной загрузки.

### Шаг 3: Ленивая загрузка SupportWidget
В `App.tsx` обернуть `SupportWidget` в `lazy()`.

### Шаг 4: Передача данных через props в сайдбар
Убрать дублирующий вызов API в `DashboardSidebar.tsx`, передавать `profile` и `hasUnreadNews` через props.

### Шаг 5: Быстрый путь для лендинга
В `AuthRedirect.tsx` — если в localStorage нет токена Supabase, сразу показывать контент без async-проверки.

### Шаг 6: Разделение бандла в Vite
Добавить `manualChunks`: react-vendor, ui-vendor, framer-motion, supabase — отдельными чанками.

## Ожидаемый эффект
- **Лендинг**: на 40-60% быстрее (нет задержки auth, нет framer-motion)
- **Дашборд**: на ~50% быстрее первая загрузка (ленивые вкладки, минус 200-400KB JS)
- **Админка**: тоже выигрывает от ленивой загрузки

## Файлы для изменения
- `src/pages/Dashboard.tsx` — lazy-импорты вкладок
- `src/App.tsx` — lazy SupportWidget
- `src/components/AuthRedirect.tsx` — fast-path через localStorage
- `src/components/support/SupportWidget.tsx` — CSS вместо framer-motion
- `src/components/dashboard/DashboardPageWrapper.tsx` — CSS вместо framer-motion
- `src/components/dashboard/DashboardSidebar.tsx` — убрать дублирующий API-вызов
- `vite.config.ts` — manualChunks

