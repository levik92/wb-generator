
# План: Замена спиннера на анимацию молнии в App.tsx

## Проблема

В файле `App.tsx` определен локальный компонент `PageLoader` со старой CSS-анимацией спиннера (строки 43-47). Этот компонент используется как fallback для `Suspense`, который оборачивает все lazy-loaded страницы.

В `ProtectedRoute.tsx` и `AuthRedirect.tsx` уже используется новый `PageLoader` из `lightning-loader.tsx`, но `App.tsx` не был обновлен.

## Решение

### Изменения в файле: `src/App.tsx`

1. **Добавить импорт** нового `PageLoader` из `lightning-loader.tsx`
2. **Удалить локальное определение** старого `PageLoader` (строки 43-47)

```
Изменение:

// Добавить импорт:
import { PageLoader } from "@/components/ui/lightning-loader";

// Удалить локальный компонент:
- const PageLoader = () => (
-   <div className="min-h-screen flex items-center justify-center bg-background">
-     <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
-   </div>
- );
```

После этого изменения Suspense fallback будет использовать новую анимацию молнии для всех lazy-loaded страниц.

---

## Технические детали

- Затронутый файл: `src/App.tsx`
- Тип изменения: замена импорта и удаление локального компонента
- Риски: отсутствуют, так как новый `PageLoader` уже работает в других компонентах
