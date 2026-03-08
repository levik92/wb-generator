

# План: Светлая тема для лендинга и публичных страниц

## Масштаб изменений

Сейчас все публичные страницы используют тёмную тему с хардкодом `bg-[#111111]`, `text-white`, `white/50` и т.д. Нужно перевести на светлую тему с сохранением стильного, современного вида. Дашборд и админка не затрагиваются.

## Подход

Вместо замены сотен хардкодных цветов в каждом компоненте, создадим **CSS-переменные для публичных страниц** (`.landing-light`) и заменим хардкодные цвета на эти переменные. Это даёт единую точку управления и чистый код.

## 1. Обновить `landing-theme.css`

Переписать `.landing-dark` → `.landing-light` с новой палитрой:
- Фон: белый/светло-серый (`#FAFAFA` → `#FFFFFF`)
- Текст: тёмно-серый/чёрный
- Glass-карточки: белые с тонкими тенями вместо полупрозрачных тёмных
- Акцентный purple остаётся, но адаптирован для светлого фона
- Glow-эффекты заменяются на мягкие тени и градиенты
- FAQ-items: белый фон с бордером
- Grid-pattern: тёмные линии на светлом фоне
- Noise overlay: убрать или минимизировать

## 2. Обновить компоновочные файлы

**Landing.tsx, ServicePageLayout.tsx, Auth.tsx, Cases.tsx:**
- Убрать `document.documentElement.classList.add("dark")` 
- Убрать `document.body.style.backgroundColor = "#111111"`
- Заменить `bg-[#111111] text-white landing-dark` → `bg-white text-gray-900 landing-light`

## 3. LandingHeader.tsx

- Scrolled state: `bg-white/80 backdrop-blur-xl border-b border-gray-200` вместо `bg-[hsl(240,10%,6%)]/80`
- Текст: `text-gray-600 hover:text-gray-900` вместо `text-white/70 hover:text-white`
- Dropdowns: `bg-white border-gray-200` вместо `bg-[hsl(240,10%,10%)] border-white/10`
- Mobile menu: `bg-white` вместо `bg-[hsl(240,10%,8%)]`
- Логотип текст: `text-gray-900` вместо `text-white`

## 4. HeroSection.tsx

- Фоновый градиент: мягкий светлый purple gradient (`from-purple-50 via-white to-purple-50/30`)
- Orbs: фиолетовые с низкой opacity на светлом фоне
- Текст заголовка: `text-gray-900` вместо `text-white`
- Подзаголовок: `text-gray-500` вместо `text-white/60`
- Статистика: белые карточки с тенью вместо glass-card
- Бейдж: `bg-purple-50 border-purple-200` вместо `bg-white/5 border-white/10`

## 5. Все секции лендинга (Features, HowItWorks, Comparison, FAQ, CTA, Examples, PricingTeaser)

Единый паттерн замены:
- `bg-[hsl(240,10%,4%)]` → `bg-white` или `bg-gray-50`
- `text-white` → `text-gray-900`
- `text-white/50`, `text-white/70` → `text-gray-500`, `text-gray-600`
- `bg-white/5 border-white/10` (бейджи) → `bg-purple-50 border-purple-200`
- `glass-card` → белые карточки с `shadow-md border border-gray-100`
- `via-white/10` (разделители) → `via-gray-200`
- CTA секция: оставить с пурпурным градиентным фоном (тёмный блок на светлой странице — контрастный акцент)

## 6. LandingFooter.tsx

- Фон: тёмный `bg-gray-900` (контрастный footer — стандарт для светлых сайтов)
- Или светлый `bg-gray-50` с тёмным текстом — зависит от эстетики
- Бордеры: `border-gray-200`

## 7. Auth.tsx

- Фон: светлый gradient вместо `#111111`
- Карточка авторизации: белая с тенью
- Инпуты: стандартные светлые (уже есть в `:root` CSS переменных)

## 8. Cases.tsx, Blog.tsx, KnowledgeBase.tsx, PartnersPage.tsx, PricingPage.tsx

Все используют `ServicePageLayout` — достаточно обновить layout + точечные правки в хардкодных цветах внутри компонентов.

## 9. Стильные переходы и эффекты для светлой темы

- Glass-карточки → карточки с `backdrop-blur` + белый фон + мягкая тень при hover
- Hover на карточках: subtle `shadow-lg` + border-purple-200
- Кнопки: purple gradient остаётся (хорошо смотрится на белом)
- Секции чередуются: `bg-white` / `bg-gray-50` для визуального ритма
- Градиентные акценты: мягкие purple-to-pink на светлом фоне

## Файлы для изменения

| Файл | Изменение |
|---|---|
| `src/styles/landing-theme.css` | Полная переработка под светлую тему |
| `src/pages/Landing.tsx` | Убрать dark mode, светлые классы |
| `src/pages/Auth.tsx` | Светлый фон и карточка |
| `src/pages/Cases.tsx` | Светлая тема |
| `src/components/landing/LandingHeader.tsx` | Светлый header |
| `src/components/landing/LandingFooter.tsx` | Тёмный или светлый footer |
| `src/components/landing/HeroSection.tsx` | Светлый hero |
| `src/components/landing/FeaturesSection.tsx` | Светлые карточки |
| `src/components/landing/HowItWorksSection.tsx` | Светлые шаги |
| `src/components/landing/ComparisonSection.tsx` | Светлая таблица |
| `src/components/landing/FAQSection.tsx` | Светлый аккордеон |
| `src/components/landing/CTASection.tsx` | Контрастный CTA блок |
| `src/components/landing/ExamplesSection.tsx` | Светлые примеры |
| `src/components/services/PricingTeaser.tsx` | Светлый тизер |
| `src/components/services/ServicePageLayout.tsx` | Убрать dark mode |
| Все компоненты в `src/components/services/` | Точечные цветовые правки |

Примерно 20 файлов. Реализация поэтапно: сначала CSS + layout, потом header/footer, потом секции лендинга, потом остальные страницы.

