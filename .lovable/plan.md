# План: Документация для разработчика (PDF, RU)

Соберу единый PDF-файл `wbgen-developer-docs.pdf` в `/mnt/documents/` с максимально полной технической документацией проекта на русском языке. Источники — фактический код в репозитории, конфигурация (`vite.config.ts`, `src/config/runtime.ts`, `supabase/functions/_shared/runtime-config.ts`, `src/App.tsx`), список edge-функций, схема БД из Supabase, накопленные правила в `mem://` и существующие отчёты (`README.md`, `SECURITY_FIXES.md`, `FINAL_REPORT.md`).

## Структура PDF

1. **Обзор проекта** — назначение (генератор карточек WB/Avito), целевые пользователи, домены (`wbgen.ru`, `wbgen.online`), брендинг.
2. **Технологический стек** — React 18 + Vite 5 + TS + Tailwind + shadcn/ui, framer-motion, TanStack Query, Supabase, PWA (Workbox), полный список зависимостей с пояснениями.
3. **Архитектура приложения** — диаграмма потока (Browser → `api.wbgen.ru` (Caddy/Nginx) → Supabase/Lovable; Edge → Gemini/Kling/Polza/YooKassa/CloudPayments/Tochka/Telegram).
4. **Структура репозитория** — детальное дерево `src/`, `supabase/functions/`, `public/`, конвенции именования.
5. **Маршрутизация и страницы** — все роуты из `App.tsx`, какие защищены `ProtectedRoute`, lazy-loading, страницы промо/квиза/Avito.
6. **Frontend-модули**:
   - Dashboard (Generate, History, Balance, Pricing, Bonuses, Referrals, Settings, VideoCovers, LabelGenerator, …)
   - Admin (Users, Analytics, Payments, Pricing, Bonuses, Friends, News, Banners, Support, Prompts, ImageSettings, ProxySettings, UtmSources, VideoLessons, Advanced Finance)
   - Landing + сервисные страницы (`/sozdanie-kartochek` и т.д.)
   - Поддержка: SupportWidget, SupportChat
7. **Дизайн-система** — токены `index.css`, `tailwind.config.ts`, правила (HSL, семантические токены, нет `backdrop-blur` в админке, ResponsiveDialog/Drawer).
8. **Конфигурация и окружения** — `src/config/runtime.ts`, `supabase/functions/_shared/runtime-config.ts`, `.env`, `vite.config.ts` (PWA, manualChunks, Workbox runtimeCaching).
9. **Региональное проксирование** — `api.wbgen.ru` (Caddy/Nginx) перед Supabase, `storage-proxy-guard.ts`, причина (блокировка РКН), переписывание storage URL.
10. **Backend (Supabase Edge Functions)** — таблица с описанием всех ~55 функций: назначение, входы/выходы, секреты, права (anon vs service_role), упоминание deprecated (`create-generation-job`, `process-generation-tasks`).
11. **Генерация контента** — конвейер v2/banana, абстракция AI-провайдеров (direct Gemini / Polza / Lovable), retry-логика, polling для видео (Kling), таймауты (9 мин), оркестрация stale-job через pg_cron.
12. **Биллинг и платежи** — YooKassa, CloudPayments, Tochka (B2B инвойсы), вебхуки, cleanup-stale-payments, схема тарифов (6 уровней, 30-дневный сброс), trial-пакеты, реферальная программа, авто-возвраты токенов.
13. **Токены и защита баланса** — стоимость операций, триггеры баланса, RLS, доступ админа к истории, протекция от подмены.
14. **База данных** — основные таблицы (`profiles`, `user_roles`, `token_transactions`, `payments`, `referrals`, `generation_jobs`, `support_*`, `bonuses`, `promo_codes`, `blog_posts`, и др.), enum `app_role`, RLS-стратегия, security-definer функции (`has_role`).
15. **Безопасность** — роли через `user_roles`, RLS-политики, `service_role` только в edge, хранение секретов, шифрование вложений поддержки, аудит уязвимостей март-2026.
16. **Аутентификация** — Supabase Auth, Yandex Smart Captcha, проверка email через PostgREST, OAuth, robust sign-out, регистрационный hook fix.
17. **Аналитика и трекинг** — Yandex Metrika (`YandexMetrika.tsx`, ROUTE_GOALS, `reachGoal`), Meta Pixel, UTM (`useUtmTracking`, AuthRedirect), админ-метрики (MSK time, конверсии).
18. **Уведомления и поддержка** — Telegram-бот, NotificationCenter, SupportWidget с авто-закрытием, шифрование сообщений.
19. **PWA и производительность** — manifest, Workbox runtimeCaching, denylist для OAuth, лимит 5MB, manual chunks, lazy-loading, preconnect.
20. **Лимиты и ограничения** — изображения 3MB/5MB, длины полей dashboard, Kling 150/2500 char, лимит Supabase 1000 строк и стратегия обхода.
21. **Бизнес-правила** — токен-политика регистрации (0 + бонус при первой оплате), партнёрская комиссия, retention 1 месяц, генерация в стиле, кластеризация истории.
22. **Локализация и UX-правила** — все ошибки на русском, скрытие моделей ИИ от пользователей, единый ResponsiveDialog.
23. **Деплой и инфраструктура** — Lovable host, Caddy/Nginx, домены, переменные окружения, как добавлять секреты, ссылки на дашборд Supabase.
24. **Эксплуатация** — pg_cron задачи (cleanup-stale-payments, cleanup-old-storage, cleanup-stale-jobs, cleanup-idle-widget-chats, cleanup-support-attachments), мониторинг логов edge-функций.
25. **Гайд для разработчика** — как поднять локально, конвенции, запрещённые паттерны (deprecated функции, прямой `*.supabase.co`, `backdrop-blur` в админке, CHECK с `now()`, изменения в reserved schemas).
26. **Чек-лист код-ревью** — security, RLS, локализация, лимиты, токены.
27. **Полезные ссылки** — Supabase dashboard, Edge Functions logs, SQL editor.

## Технические детали генерации

- Скрипт на Python с `reportlab` (Platypus), шрифты с кириллицей (DejaVu Sans / DejaVu Sans Mono), TOC с гиперссылками, нумерация страниц, цветовые акценты под бренд (фиолетовый `#8B5CF6`).
- Таблицы (edge-функции, тарифы, лимиты, токен-стоимости) — `Table` со стилями.
- Кодовые блоки моноширинно с фоном.
- После генерации — обязательный QA: `pdftoppm -jpeg -r 120 → page-*.jpg`, визуальная проверка каждой страницы (нет обрезаний текста, нет «чёрных боксов» от отсутствующих глифов, корректные таблицы, корректная кириллица), итерация при необходимости.
- Готовый файл: `/mnt/documents/wbgen-developer-docs.pdf` + выдача через `<presentation-artifact>`.

После одобрения плана приступаю к сборке.
