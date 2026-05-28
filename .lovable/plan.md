# План: UTM, фон-эффекты, адаптив

Аудит закончен. Ниже только реальные дыры — без переписывания того, что уже работает.

## 1. UTM-метки

**Что работает:** capture в `useUtmTracking.ts` (snapshot до React Router), сохранение в `localStorage`, передача в `raw_user_meta_data` при email-регистрации, триггер пишет в `profiles.utm_source_id`, админка показывает всё (AdminUtmSources, AdminUsers, UserDetailDialog, AdminPayments, MarketingManager).

**Что починим:**

1. **Bare `/auth` ссылки теряют `?tab=signup`** — `VideoGeneration.tsx:479`, `PartnersPage.tsx:173`, `KnowledgeArticle.tsx:1654`, `BlogArticle.tsx:315`. Заменим на `/auth?tab=signup`.
2. **Прокидывание текущих `?utm_*` в CTA** — сделаем хелпер `withUtm(path)` который берёт `window.location.search` и дописывает к ссылке. Применим в:
   - `CTASection.tsx`, `HeroSection.tsx`, `HowItWorksSection.tsx`, `ExamplesSection.tsx`
   - `LandingHeader.tsx` (все 5 ссылок на /auth)
   - `ServiceCTA.tsx` (default ctaLink)
   - 4 bare-ссылки выше
   Это нужно чтобы Yandex.Metrika / Meta Pixel видели UTM на странице конверсии.
3. **Google OAuth дыра** — `pending_utm_source_id` живёт только в sessionStorage и теряется при кросс-таб OAuth. Передадим `utm_source_id` через `redirectTo` query-параметр; `AuthRedirect` / `Dashboard` подхватит из URL и запишет в `profiles` (fallback к sessionStorage остаётся).

## 2. Фон-эффекты (лаги)

**Главный виновник:** `AuroraBackground` — `filter: blur(60px)` на элементе `140vw×140vh` + бесконечный spin. На мобилках это самый дорогой кейс.

**Фиксы в `landing-theme.css` и `AuroraBackground.tsx`:**

1. На `@media (max-width:1024px)`:
   - убрать `animation` у `.aurora-spin` целиком (сейчас только замедление до 60s — слой всё равно композитится каждый кадр)
   - снизить `filter: blur` до 30px и убрать `will-change` у конического градиента
   - орбы (`blur-[120px]`) — снизить до `blur-[60px]` и убрать `will-change`
2. `animate-ping` на бейдже `HeroSection.tsx:59` — добавить в kill-list `prefers-reduced-motion` в `landing-theme.css`.
3. `.noise-overlay` — поменять `position: fixed` → `position: absolute` внутри своего контейнера (избавит от full-page repaint при скролле на 481–768px).
4. `LandingHeader` sticky с `backdrop-blur-xl` — добавить `transform: translateZ(0)` чтобы pre-promote слой и не пересчитывать blur каждый scroll-frame на iOS.

## 3. Адаптив (фиксы overflow)

1. `Avito.tsx:142,153,162,174` — фиксированные `w-[700px]` / `w-[600px]` / `w-[420px]` декоративные орбы → обернуть в `max-w-[90vw]` или вынести в контейнер с `overflow-hidden`.
2. `Promo.tsx:61` — `w-[700px] h-[700px]` глоу-орб → добавить `max-w-[90vw] max-h-[90vw]`.
3. На корнях `Avito.tsx`, `Promo.tsx`, `PromoTwo.tsx`, `Quiz.tsx` — добавить `overflow-x-hidden` чтобы декоративные absolute-слои не давали горизонтальный скролл.
4. `CTASection.tsx:38` — `grid-cols-3` тесно на 320px → `text-xs sm:text-sm` на лейблах.

## Технические детали

- `withUtm(path)` хелпер положим в `src/lib/utm.ts`:
  ```ts
  export const withUtm = (path: string) => {
    const s = typeof window !== 'undefined' ? window.location.search : '';
    if (!s) return path;
    const sep = path.includes('?') ? '&' : '?';
    const utm = new URLSearchParams(s);
    const keep = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content'];
    const params = new URLSearchParams();
    keep.forEach(k => { const v = utm.get(k); if (v) params.set(k, v); });
    const q = params.toString();
    return q ? `${path}${sep}${q}` : path;
  };
  ```
- OAuth: `signInWithOAuth({ provider:'google', options:{ redirectTo: `${origin}/auth/redirect?utm_source_id=${id}` }})`, читать в `AuthRedirect` и писать в `profiles` если ещё пусто.
- Все правки только в frontend / CSS, БД и edge-функции не трогаем.

## Чего НЕ делаем

- Не трогаем рабочий capture в `useUtmTracking.ts` (snapshot до React Router — корректно).
- Не трогаем DB-триггер и таблицу `utm_sources`.
- Не меняем дизайн страниц, только overflow-фиксы и performance-оптимизации фона.
- Не добавляем cookie-storage и referrer-fallback (low priority, без запроса пользователя).

Готов реализовать — подтвердите план.
