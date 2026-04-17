

## План: корректное определение активности пользователей

### Проблема

Сейчас "Актив./Не актив." определяется по `profiles.updated_at`, но это поле обновляется в десятках мест (изменение баланса токенов, настроек, админских действий и т.д.) и НЕ обновляется при обычном возврате пользователя в сервис, если у него уже есть активная сессия (срабатывает `INITIAL_SESSION`/`TOKEN_REFRESHED`, а не `SIGNED_IN`).

В результате:
- Пользователь, заходящий каждый день, но не разлогинивающийся → числится "Не актив".
- Пользователь, у которого админ что-то поменял в профиле → выглядит "Актив", хотя не заходил месяцами.
- Возврат после 35 дней → может не отразиться, если событие — не `SIGNED_IN`.

### Решение

Завести отдельное поле `last_active_at` именно для трекинга визитов, независимое от `updated_at`.

### Часть 1: Миграция БД

```sql
-- Новое поле для трекинга активности
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz NOT NULL DEFAULT now();

-- Бэкфилл: используем updated_at как стартовое значение для существующих юзеров
UPDATE public.profiles SET last_active_at = updated_at WHERE last_active_at IS NULL OR last_active_at < updated_at;

-- Индекс для быстрых выборок активных пользователей
CREATE INDEX IF NOT EXISTS idx_profiles_last_active_at ON public.profiles(last_active_at DESC);

-- Обновляем функцию: пишем в last_active_at, а не в updated_at
CREATE OR REPLACE FUNCTION public.update_profile_on_login(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE profiles
  SET last_active_at = now(),
      login_count = login_count + 1
  WHERE id = user_id_param;
END;
$$;

-- Лёгкая функция для тача активности без инкремента login_count (для возвратов с активной сессией)
CREATE OR REPLACE FUNCTION public.touch_profile_activity(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE profiles
  SET last_active_at = now()
  WHERE id = user_id_param 
    AND (last_active_at IS NULL OR last_active_at < now() - interval '10 minutes');
END;
$$;
```

Гард `< now() - 10 minutes` нужен, чтобы не дёргать UPDATE при каждой навигации внутри SPA — апдейт раз в 10 минут более чем достаточен.

### Часть 2: Фронтенд — `src/components/ProtectedRoute.tsx`

Расширить логику апдейта:
- `SIGNED_IN` → `update_profile_on_login` (как сейчас, инкремент `login_count`).
- `INITIAL_SESSION` / `TOKEN_REFRESHED` (т.е. возврат в сервис с уже валидной сессией) → `touch_profile_activity` (только `last_active_at`).

Это даёт ровно описанное пользователем поведение: открыл сервис — сегодня активен; не открывал 35 дней — был "Не актив", вернулся — снова "Актив", счётчик 30 дней пошёл заново.

### Часть 3: Места, где метрика читает активность

Заменить чтение `updated_at` → `last_active_at`:

1. **`src/components/admin/AdminUsers.tsx`** (строка ~305): расчёт `isActive`.
2. **`src/components/admin/AdminAnalytics.tsx`** (строки ~50–55): запрос "Активные (30 дней)" — `recentLoginCount` через `.gte('updated_at', ...)` → `.gte('last_active_at', ...)`. Также убрать «или это пользователи, которые тратили токены» (`Math.max` с `tokenUserIds.size`) — это раздувает цифру и противоречит чёткому правилу "был ли визит за 30 дней". Оставить только проверку `last_active_at`.
3. **`src/pages/Admin.tsx`** (`loadUsers`): добавить `last_active_at` в `SELECT`, чтобы фронт мог считать.
4. **Сортировка/фильтры по «активности»** в `AdminUsers.tsx`, если они опираются на `updated_at` — переключить на `last_active_at`. Проверю при имплементации.

### Часть 4: Типы Supabase

`src/integrations/supabase/types.ts` — обновится автоматически после миграции (новая колонка + сигнатура новой функции).

### Что НЕ меняем

- Поле `updated_at` оставляем как есть — оно по-прежнему корректно отражает «когда профиль последний раз менялся» (используется триггерами/аналитикой по другим целям).
- `login_count` — логика без изменений (инкремент только при реальном SIGNED_IN).
- RLS политики — не трогаем, новое поле наследует существующие политики `profiles`.

### Технические файлы

- **Миграция**: новая SQL (ALTER + бэкфилл + 2 функции).
- **`src/components/ProtectedRoute.tsx`**: вызов `touch_profile_activity` на `INITIAL_SESSION`/`TOKEN_REFRESHED`.
- **`src/components/admin/AdminUsers.tsx`**: чтение `last_active_at`.
- **`src/components/admin/AdminAnalytics.tsx`**: метрика «Активные (30 дней)» строго по `last_active_at`.
- **`src/pages/Admin.tsx`**: добавить `last_active_at` в выборку профилей + расширить интерфейс `User`.

