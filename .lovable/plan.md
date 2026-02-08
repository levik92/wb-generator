

# Диагностика и исправление работы Telegram Mini App

## Обнаруженные проблемы

После анализа кодовой базы и документации Telegram Mini Apps выявлены **4 ключевых проблемы**, из-за которых генерация может не работать внутри Telegram:

### 1. localStorage может быть недоступен или очищаться в WebView
Supabase клиент настроен с `storage: localStorage` для хранения авторизации. В Telegram WebView localStorage может:
- Очищаться при закрытии Mini App
- Быть недоступным в некоторых версиях Android
- Терять сессию между открытиями приложения

Это означает, что пользователь может быть разлогинен при каждом открытии Mini App, и генерация не будет работать без авторизации.

### 2. Загрузка файлов через `<input type="file">` может не работать в WebView
На некоторых Android-устройствах (особенно Pixel с Android 14+) `<input type="file">` не вызывает диалог выбора файлов или камеры. Это известная проблема Telegram WebView.

### 3. Скачивание файлов через `document.createElement('a').click()` не работает в WebView
Функции `downloadSingle` и `downloadAll` создают элемент `<a>` с атрибутом `download` и вызывают `click()`. В Telegram WebView этот метод скачивания **не поддерживается** -- файлы просто не скачиваются.

### 4. `window.URL.createObjectURL` и Blob-операции могут быть ограничены
ZIP-генерация через JSZip и Blob URL могут работать некорректно в ограниченном WebView.

---

## План исправлений

### Шаг 1: Определение среды Telegram Mini App
Создать утилиту `src/lib/telegram.ts` для определения, работает ли приложение внутри Telegram WebView. Telegram добавляет `window.Telegram.WebApp` объект в свои Mini Apps.

### Шаг 2: Исправить хранение сессии Supabase
В `src/integrations/supabase/client.ts` добавить проверку доступности localStorage с fallback на memoryStorage. Это предотвратит потерю сессии и ошибки.

### Шаг 3: Добавить альтернативу для скачивания в Telegram
Для `downloadSingle` и `downloadAll` -- при обнаружении Telegram WebView открывать изображение/ссылку через `window.open()` вместо программного скачивания через `<a download>`, так как Telegram WebView может перехватить открытие ссылки и предложить скачать.

### Шаг 4: Обработка проблем с загрузкой файлов
Добавить пользовательское уведомление, если `<input type="file">` не сработал в Telegram, с предложением открыть приложение в браузере.

### Шаг 5: Viewport и стили для Telegram WebView
Telegram Mini Apps имеют собственные инсеты (safe area). Добавить CSS-переменные Telegram для корректного отображения.

---

## Технические детали

### Файл: `src/lib/telegram.ts` (новый)
```typescript
export const isTelegramWebApp = (): boolean => {
  return !!(window as any).Telegram?.WebApp;
};

export const getTelegramWebApp = () => {
  return (window as any).Telegram?.WebApp;
};
```

### Файл: `src/integrations/supabase/client.ts` (изменение)
Добавить безопасный storage wrapper:
```typescript
const safeStorage = (() => {
  try {
    localStorage.setItem('__test__', '1');
    localStorage.removeItem('__test__');
    return localStorage;
  } catch {
    // Fallback to in-memory storage for Telegram WebView
    const store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
    };
  }
})();
```

### Файл: `src/components/dashboard/GenerateCards.tsx` (изменение)
В функциях `downloadSingle` и `downloadAll` -- добавить проверку `isTelegramWebApp()` и использовать `window.open(image.url, '_blank')` для прямого открытия изображения вместо blob-скачивания.

### Файл: `index.html` (изменение)
Добавить скрипт Telegram Web App SDK:
```html
<script src="https://telegram.org/js/telegram-web-app.js"></script>
```
Это необходимо для корректной работы Mini App и определения среды.

