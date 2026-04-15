

## Диагностика: регистрация зависает на загрузке

### Корневая причина

Функция `send-welcome-email` настроена как **Auth Hook** в Supabase (вызывается синхронно при signup). Проблема в обработке ошибок:

Если отправка письма через Resend не удаётся (таймаут API, невалидный ключ, лимит запросов), функция возвращает **HTTP 500**. Когда Auth Hook возвращает не-200 статус, Supabase Auth **откатывает регистрацию** или зависает с ожиданием, что приводит к бесконечной загрузке на фронтенде.

Подтверждение: у предыдущего успешного signup (`syrtbaevaaigerim47@gmail.com`) длительность составила 3.4 секунды — это время работы hook. При этом логов функции `send-welcome-email` в Supabase нет вообще, что указывает на проблемы с деплоем или инициализацией.

### План исправления

**Файл: `supabase/functions/send-welcome-email/index.ts`**

1. **Всегда возвращать HTTP 200** — даже если отправка письма провалилась. Auth Hook не должен блокировать регистрацию из-за проблем с email.

2. **Обернуть отправку в try/catch с логированием** — ошибки логировать, но не бросать дальше.

3. **Добавить таймаут на Resend API** — чтобы функция не зависала, если Resend не отвечает.

```typescript
// Ключевое изменение в блоке catch:
// Было: return new Response(..., { status: 500 })
// Станет: return new Response(JSON.stringify({ success: true }), { status: 200 })

// Логика: регистрация НЕ должна зависеть от доставки email
```

### Техническое изменение

```typescript
serve(async (req) => {
  // ... парсинг запроса ...

  try {
    // отправка письма через Resend
    const { error } = await resend.emails.send({ ... });
    if (error) {
      console.error('Email send failed, but allowing signup:', error);
      // НЕ бросаем ошибку — возвращаем 200
    }
  } catch (error) {
    console.error('send-welcome-email error (non-blocking):', error);
    // НЕ возвращаем 500 — всегда 200
  }

  // ВСЕГДА возвращаем 200, чтобы Auth Hook не блокировал signup
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
```

Это одно изменение в одном файле. После деплоя регистрация перестанет зависать, даже если Resend недоступен.

