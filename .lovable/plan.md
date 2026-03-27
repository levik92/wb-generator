

## Проблема

При нажатии «Выйти» показывается ошибка «Не удалось выйти из системы». Причина: функция `handleSignOut` в `Dashboard.tsx` использует `scope: 'global'`, который требует валидную серверную сессию. Если сессия уже истекла (частая ситуация), Supabase возвращает ошибку, и код показывает toast вместо того, чтобы просто выйти.

## Решение

**Файл: `src/pages/Dashboard.tsx`** — изменить функцию `handleSignOut`:

- Заменить `scope: 'global'` на `scope: 'local'` — локальный выход всегда работает
- Перенести `navigate("/")` в блок `finally`, чтобы редирект происходил в любом случае
- Убрать toast с ошибкой — выход должен всегда «успешно» завершаться для пользователя

```typescript
const handleSignOut = async () => {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch (error) {
    console.error('Sign out error:', error);
  } finally {
    navigate("/");
  }
};
```

Одно изменение в одном файле, ~5 строк.

