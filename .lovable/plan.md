

## Аудит фронтенда: мертвый и неиспользуемый код

### Результаты проверки

Найдено значительное количество файлов и зависимостей, которые нигде не используются, но попадают в бандл или засоряют проект.

---

### 1. Неиспользуемые компоненты (файлы для удаления)

| Файл | Причина |
|------|---------|
| `src/components/Snowfall.tsx` | Нигде не импортируется. Сезонный эффект, забытый в коде. Также засоряет tailwind.config.ts анимацией `snowfall`. |
| `src/components/ForceLightTheme.tsx` | Нигде не импортируется. |
| `src/components/BeforeAfterSlider.tsx` | Старая версия. Заменена на `BeforeAfterSliderNew`. Нигде не используется. |
| `src/components/dashboard/OptimizedGenerateCards.tsx` | Нигде не импортируется. Видимо старая/альтернативная версия `GenerateCards`. |
| `src/components/dashboard/SecurityDashboard.tsx` | Используется только из `dashboard/AdminAnalytics.tsx`, который сам мертвый (см. ниже). |
| `src/components/dashboard/AdminAnalytics.tsx` | Старый дубликат `admin/AdminAnalytics.tsx`. Нигде не импортируется. |
| `src/components/dashboard/CasesPromoBanner.tsx` | Нигде не импортируется. |
| `src/components/dashboard/CasesPromoBlock.tsx` | Нигде не импортируется. |
| `src/components/dashboard/RedeemPromoCode.tsx` | Нигде не импортируется. |
| `src/components/dashboard/DashboardPageWrapper.tsx` | Нигде не импортируется. |
| `src/components/dashboard/Pricing.tsx` | Нигде не импортируется (Balance.tsx используется вместо неё). |
| `src/components/mobile/OnboardingWizard.tsx` | Нигде не импортируется. |
| `src/components/ui/optimized-image.tsx` | Нигде не импортируется. |
| `src/components/ui/resizable.tsx` | Нигде не импортируется. |
| `src/components/ui/input-otp.tsx` | Нигде не импортируется. |
| `src/components/ui/carousel.tsx` | Нигде не импортируется. |
| `src/components/ui/hover-card.tsx` | Нигде не импортируется. |
| `src/components/ui/context-menu.tsx` | Нигде не импортируется. |
| `src/components/ui/menubar.tsx` | Нигде не импортируется. |
| `src/components/ui/navigation-menu.tsx` | Нигде не импортируется. |
| `src/components/ui/aspect-ratio.tsx` | Нигде не импортируется. |
| `src/components/ui/breadcrumb.tsx` | Нигде не импортируется. |
| `src/components/ui/toggle-group.tsx` | Нигде не импортируется (toggle.tsx используется только отсюда). |
| `src/components/ui/toggle.tsx` | Используется только из toggle-group.tsx, который сам мертвый. |

### 2. Неиспользуемые npm-зависимости

| Пакет | Причина |
|-------|---------|
| `react-resizable-panels` | Используется только в мертвом `resizable.tsx`. |
| `input-otp` | Используется только в мертвом `input-otp.tsx`. |
| `embla-carousel-react` | Используется только в мертвом `carousel.tsx`. |
| `@types/papaparse` | Это types-пакет в dependencies вместо devDependencies. Не критично для производительности, но некорректно. |

**Примечание**: `react-icons` используется (Auth.tsx + BonusProgram.tsx), поэтому оставляем.

### 3. Мертвый код в tailwind.config.ts

- Анимация `snowfall` и соответствующие keyframes — можно удалить вместе с компонентом.

---

### План действий

1. **Удалить ~23 неиспользуемых файла** (список выше)
2. **Удалить 3 неиспользуемые npm-зависимости** из package.json: `react-resizable-panels`, `input-otp`, `embla-carousel-react`
3. **Перенести `@types/papaparse`** из dependencies в devDependencies
4. **Очистить tailwind.config.ts** от анимации `snowfall`

### Влияние

- Уменьшение размера бандла за счет удаления tree-shaking-невозможных модулей и лишних зависимостей
- Чище кодовая база, меньше путаницы
- Никаких функциональных изменений — всё удаляемое нигде не используется

