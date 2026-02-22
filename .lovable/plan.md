

## Локализация ошибок входа в систему

### Что будет сделано

В файлах `src/pages/Auth.tsx` и `src/pages/AdminLogin.tsx` добавим маппинг английских ошибок Supabase на русские сообщения.

### Ошибки для локализации

| Supabase (англ.) | Русский перевод |
|---|---|
| `Invalid login credentials` | Неверный email или пароль |
| `Email not confirmed` | Подтвердите email перед входом. Проверьте почту. |

### Технические детали

1. **Создать функцию-маппер** `localizeAuthError(message: string): string` в обоих файлах (или вынести в утилиту):

```typescript
const localizeAuthError = (msg: string): string => {
  const map: Record<string, string> = {
    'Invalid login credentials': 'Неверный email или пароль',
    'Email not confirmed': 'Подтвердите email перед входом. Проверьте почту.',
  };
  return map[msg] || msg;
};
```

2. **Auth.tsx (строка ~249)** -- в `catch` блоке заменить `error.message` на `localizeAuthError(error.message)`:
```typescript
toast({ title: "Ошибка входа", description: localizeAuthError(error.message), variant: "destructive" });
```

3. **AdminLogin.tsx (строка ~63)** -- аналогично локализовать `error.message` в toast при ошибке входа.

### Файлы для изменения
- `src/pages/Auth.tsx`
- `src/pages/AdminLogin.tsx`

