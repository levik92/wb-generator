## Цель

Добавить в админке («Аналитика») кнопку «Расширенная аналитика» снизу. Открывает внутренний экран в той же области контента (боковое меню сохраняется), с кнопкой «Назад». Внутри — РНП-дашборд и подразделы: ОПиУ, ДДС, Расходы, Маркетинг.

## Навигация

- В `AdminAnalytics.tsx` под текущими блоками добавляем кнопку «Расширенная аналитика».
- Состояние подраздела хранится в URL через query-параметр `?view=advanced&section=rnp|opiu|dds|expenses|marketing` (на странице `/admin`, в табе analytics). Это даёт «Назад» через `history.back()` и deep-link.
- Внутри Analytics добавляем компонент `AdvancedAnalytics` с собственным sub-router (по query): хедер с хлебными крошками «Аналитика › Расширенная › <раздел>» + кнопка «Назад».
- Главный экран расширенной — РНП. Карточки «ОПиУ», «ДДС», «Расходы», «Маркетинг» снизу — провал в соответствующий sub-view.

## Данные и формулы

Период выбирается календарём (DatePickerWithRange, уже есть). По умолчанию — текущий месяц (МСК).

Доходы (Выручка):
- payments: SUM(amount) WHERE status='succeeded' AND confirmed_at в периоде
- invoice_payments: SUM(amount) WHERE status='paid' AND reviewed_at в периоде
- Выручка = сумма двух

Себестоимость:
- Сумма expenses за период с категорией `cogs` (API/серверы/сторонний софт). Категория задаётся в расходе.

Налоги:
- `tax_rate` хранится в новой таблице `finance_settings` (например, 6%).
- Налог = Выручка × tax_rate.

Операционные расходы (OPEX):
- Сумма expenses за период с категориями ≠ `cogs` и ≠ `marketing` (бухгалтер, ЗП, представительские, прочее). Налоги — отдельной категорией `tax` (если введён вручную) либо считаются авто (по настройке учитывать ли ручные tax-расходы — для MVP: авто, ручные tax-расходы исключаются из расчёта чтобы не дублировать).

Маркетинговые расходы:
- Сумма marketing_expenses за период (отдельная таблица, см. ниже).

Метрики РНП:
- Выручка
- Себестоимость
- Валовая прибыль = Выручка − Себестоимость
- Маржинальность (% от выручки) = Валовая прибыль / Выручка × 100
- Налоги = Выручка × tax_rate
- Маркетинг (расход)
- OPEX
- Чистая прибыль = Выручка − Себестоимость − Налоги − Маркетинг − OPEX
- Рентабельность = Чистая прибыль / Выручка × 100

ОПиУ (таблица помесячно за выбранный период):
- Строки: Выручка, Себестоимость, Валовая прибыль, Маркетинг, OPEX (с разбивкой по подкатегориям), Налоги, Чистая прибыль. Колонки — месяцы.

ДДС (cash flow, кассовый метод):
- Приток: payments.succeeded + invoice_payments.paid (по факту confirmed_at/reviewed_at)
- Отток: expenses + marketing_expenses (по `expense_date`)
- Итог: Δ за период, остаток (по умолчанию — Σ всех Δ от начала; стартовый баланс задаётся в `finance_settings.starting_cash`)

Расходы:
- Список с фильтрами (категория, тег, диапазон дат), CRUD-форма: категория, дата, название, сумма, тег, заметка.
- Категории (enum): `cogs`, `salary_admin`, `marketing`, `representative`, `tax`, `accounting`, `other`.
- Маркетинговые расходы кладутся в `marketing_expenses` (а не в общую таблицу), но в ОПиУ/ДДС объединяются. Альтернатива: единая таблица expenses + поле `channel` для marketing-категории. Выбираем единую таблицу с категорией `marketing` + опциональным `channel_id` ссылающимся на `marketing_channels`.

Маркетинг (раздел):
- Таблица каналов `marketing_channels`: name, tag, notes.
- На странице — список каналов с агрегатами за период:
  - Расход = SUM(expenses.amount WHERE category='marketing' AND channel_id=X)
  - Доход (вручную) = SUM(marketing_revenues.amount за период по каналу) — ручной ввод (по решению пользователя)
  - ROI = (Доход − Расход) / Расход × 100

## Схема БД (новые таблицы)

`finance_settings` (singleton):
- tax_rate numeric (по умолч. 6)
- starting_cash numeric (по умолч. 0)
- updated_at, updated_by

`expense_categories` (enum через text + check):
- cogs, salary_admin, marketing, representative, tax, accounting, other

`expenses`:
- id, expense_date date, name text, amount numeric, category text, tag text, channel_id uuid null, notes text, created_by, created_at

`marketing_channels`:
- id, name, tag, notes, is_active, created_at

`marketing_revenues`:
- id, channel_id, period_month date (первое число месяца), amount numeric, notes, created_at

RLS — только админ (`has_role(auth.uid(),'admin')`) для всех таблиц на ALL.

## UI-структура

`src/components/admin/advanced/`
- `AdvancedAnalytics.tsx` — router-обёртка (по query), хедер с «Назад» и хлебными крошками
- `RnpDashboard.tsx` — period picker + StatCard'ы основных метрик + мини-таблица
- `OpiuReport.tsx` — таблица помесячно
- `DdsReport.tsx` — таблица притоков/оттоков + итоговые
- `ExpensesManager.tsx` — список + диалог CRUD (ResponsiveDialog), фильтры
- `MarketingManager.tsx` — список каналов, ввод доходов по месяцам, агрегаты ROI

`src/hooks/useFinanceData.ts` — общие fetch-функции с агрегатами по периоду (одним запросом получаем revenue/expenses/marketing для текущего периода). Используем PostgREST.

## Доступ

Все запросы — клиентские с RLS-проверкой роли admin (как остальной админ-функционал). Без edge-функций.

## Этапы реализации

1. Миграция: `finance_settings`, `expenses`, `marketing_channels`, `marketing_revenues` + RLS.
2. Хук `useFinanceData` + общие утилиты периодов/формул.
3. Кнопка «Расширенная аналитика» в `AdminAnalytics`, query-роутинг.
4. `AdvancedAnalytics` контейнер + `RnpDashboard`.
5. `ExpensesManager` (CRUD).
6. `MarketingManager` (каналы + ручные доходы + ROI).
7. `OpiuReport`, `DdsReport`.
8. Настройки (tax_rate, starting_cash) — компактная панель в РНП.

## Открытые вопросы (не блокирующие — приму дефолты, если не уточните)

- Дефолт периода: текущий месяц (МСК).
- Конвертация валют не требуется (всё RUB).
- Стартовый баланс ДДС задаётся в настройках.

Готов реализовывать после утверждения.
