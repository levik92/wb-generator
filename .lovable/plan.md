

# Dashboard UX Optimization: Header Titles + History Filter + News Button

## Summary

Move page titles/subtitles from each tab component into the dashboard header (matching Admin pattern), remove decorative icon blocks, resize header to match Admin, inline the History filter with the header, and expand the News "mark all read" button to show text.

## Changes

### 1. DashboardHeader — add dynamic title/subtitle, resize to match Admin

**`src/components/dashboard/DashboardHeader.tsx`**
- Add `TAB_TITLES` map (like Admin's) with title+subtitle for each tab
- Accept `activeTab` prop to look up current title
- Replace "Добро пожаловать!" / "AI-сервис..." with `TAB_TITLES[activeTab].title` / `.subtitle`
- Change header height from `h-16` to `h-[76px]` (matching Admin)
- Change `bg-card/50 backdrop-blur-xl` to `bg-card` (matching Admin)
- Accept optional `headerActions` ReactNode prop for inline controls (used by History for its filter)

### 2. Dashboard.tsx — pass activeTab + headerActions to DashboardHeader

**`src/pages/Dashboard.tsx`**
- Pass `activeTab` to `DashboardHeader`
- Lift History filter state up: when `activeTab === 'history'`, render the filter Select as `headerActions` passed to DashboardHeader
- Same for News: pass "Прочитать все" button as `headerActions` when `activeTab === 'news'`
- For notifications tab: pass "Прочитать все" button similarly

Actually, simpler approach: each tab keeps its own actions but the **title+subtitle** moves to the header. For History specifically, the filter needs to be at the header level.

**Revised approach** (simpler, less refactoring):
- DashboardHeader receives `activeTab` and shows the title/subtitle from the map
- History, News, NotificationCenter keep their own action bars but remove the title+icon blocks
- History filter stays inside History component but on the same row as a compact "info" line instead of a big title

Wait — the user wants the History filter "on the same level as the title" which is now in the header. Let me re-read: "в разделе истории фильтр сделать на том же уровне что и надпись с уведомлением тогда и просто иконка". So the filter should be in the header bar, next to the title. That means DashboardHeader needs to accept actions/slot content.

**Final approach:**
- `DashboardHeader` accepts `activeTab` for title and `headerActions?: ReactNode` for right-side actions before the user menu
- Dashboard.tsx passes filter Select for history tab, "Прочитать все" button for news/notifications
- But this requires lifting state... Actually for History filter, it's simpler to keep it inside History and just remove the title block. The header already shows the title.

Let me reconsider: the user said "фильтр сделать на том же уровне что и надпись" — they want the filter next to the page title in the header. And "просто иконка" — just a filter icon (no text label).

This means I need to lift the filter to Dashboard level and pass it to the header. Same for News "Прочитать все" button.

### Detailed File Changes

#### `src/components/dashboard/DashboardHeader.tsx`
- Add `activeTab` prop and `TAB_TITLES` record
- Add `headerActions?: React.ReactNode` prop
- Replace static title with dynamic `TAB_TITLES[activeTab]`
- Change `h-16` → `h-[76px]`, `bg-card/50 backdrop-blur-xl` → `bg-card`
- Render `headerActions` between title area and right controls

#### `src/pages/Dashboard.tsx`
- Add `historyFilter` state (`'all' | 'cards' | 'description' | 'video'`) lifted from History
- Pass `activeTab` to DashboardHeader
- Build `headerActions` based on active tab:
  - `history`: compact Select dropdown with filter icon trigger
  - `news`: "Прочитать все" Button
  - `notifications`: "Прочитать все" Button  
- Pass `filter`/`onFilterChange` to History instead of History managing its own
- Pass `onMarkAllRead` callback from News

#### `src/components/dashboard/History.tsx`
- Accept `filter` and `onFilterChange` as props (keep internal state as fallback)
- Remove the title+icon block (both loading and loaded states)
- Remove the filter row from the component body
- Keep the info alert and everything else

#### `src/pages/News.tsx`
- Remove the title+icon block
- Remove the "Прочитать все" icon button (moved to header)
- Accept optional `onMarkAllRead` callback or expose via ref
- The `markAllAsRead` function needs to be callable from Dashboard

#### `src/components/dashboard/NotificationCenter.tsx`
- Remove title block
- `markAllAsRead` callable from parent or accept `onMarkAllRead` prop

#### All other tab components (8 files)
Remove the title+icon header block from:
- `GenerateCards.tsx` — remove lines with icon div + h2 + subtitle
- `GenerateDescription.tsx` — same
- `VideoCovers.tsx` — same  
- `LabelGenerator.tsx` — same
- `Settings.tsx` — same
- `BonusProgram.tsx` — same
- `Referrals.tsx` — same

### TAB_TITLES Map

```typescript
const TAB_TITLES: Record<string, { title: string; subtitle: string }> = {
  cards: { title: 'Генерация карточек', subtitle: 'Создайте карточки для Wildberries с помощью ИИ' },
  video: { title: 'Видеообложки', subtitle: 'Создайте видеообложки для карточек' },
  description: { title: 'Генерация описаний', subtitle: 'Создайте описание товара для Wildberries' },
  labels: { title: 'Генератор этикеток', subtitle: 'Создание этикеток для товаров' },
  history: { title: 'История генераций', subtitle: 'Все ваши созданные карточки и описания' },
  pricing: { title: 'Баланс', subtitle: 'Пополнение и управление токенами' },
  bonuses: { title: 'Бонусы', subtitle: 'Бонусные и реферальные программы' },
  settings: { title: 'Настройки', subtitle: 'Управление профилем и подключениями' },
  notifications: { title: 'Уведомления', subtitle: 'Ваши уведомления' },
  news: { title: 'Новости', subtitle: 'Последние обновления сервиса' },
  learning: { title: 'Обучение', subtitle: 'Видеоуроки и материалы' },
  support: { title: 'Поддержка', subtitle: 'Чат с поддержкой' },
};
```

### Mobile Header
The mobile header in Dashboard.tsx also needs the dynamic title. Currently it shows "WBGen" logo. The user's request is about the desktop header primarily since mobile has MobileTabBar. The mobile header will stay as-is (logo-based).

### Files Modified (13 files)

| File | Change |
|------|--------|
| `DashboardHeader.tsx` | Dynamic title, headerActions slot, height fix |
| `Dashboard.tsx` | Pass activeTab, lift history filter + news/notif actions |
| `History.tsx` | Remove title+icon+filter, accept filter props |
| `News.tsx` | Remove title+icon, expose markAllAsRead, full "Прочитать все" button |
| `NotificationCenter.tsx` | Remove title block, expose markAllAsRead |
| `GenerateCards.tsx` | Remove title+icon block |
| `GenerateDescription.tsx` | Remove title+icon block |
| `VideoCovers.tsx` | Remove title+icon block |
| `LabelGenerator.tsx` | Remove title+icon block |
| `Settings.tsx` | Remove title+icon block |
| `BonusProgram.tsx` | Remove title+icon block |
| `Referrals.tsx` | Remove title+icon block |
| `Balance.tsx` | Remove title+icon block (if present) |

