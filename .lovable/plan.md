

# Plan: System Status Banner with Admin Toggle

## Overview

Add a "System Status" control in the admin banners section that allows switching between 4 states: off, green (all OK), yellow (possible issues), red (unstable). This status banner displays at the top of the dashboard, above all other content.

## Database

Create a new table `system_status` with a single row:
- `id` (uuid, PK)
- `status` (text: 'none' | 'green' | 'yellow' | 'red', default 'none')
- `message` (text, custom admin message)
- `updated_at` (timestamptz)

RLS: admins can manage, everyone authenticated can read.

## Admin Panel (`AdminBanners.tsx`)

Add a "Статус системы" card at the top of the banners page with:
- 4 clickable buttons/chips: **Выключен** (none), **Всё работает** (green), **Возможны сбои** (yellow), **Нестабильная работа** (red)
- Each button visually styled with its color
- Optional editable message field (pre-filled with defaults like "Сервера загружены, возможны задержки при генерации" for yellow, "Сервера перегружены, генерация может не работать" for red)
- Saves to `system_status` table on click

## Dashboard (`Dashboard.tsx` + new `SystemStatusBanner.tsx`)

Create `SystemStatusBanner` component:
- Fetches from `system_status` table
- If status is 'none', renders nothing
- Green: subtle green bar with checkmark "Все системы работают нормально"
- Yellow: amber/orange bar with warning icon + admin message
- Red: red bar with alert icon + admin message
- Rendered above `<DashboardBanners>` in Dashboard, not dismissible
- Compact design: single line with icon + text

## Files to Create/Edit

| File | Action |
|------|--------|
| DB migration | Create `system_status` table with seed row |
| `src/components/dashboard/SystemStatusBanner.tsx` | Create - dashboard status display |
| `src/components/admin/AdminBanners.tsx` | Add status control card at top |
| `src/pages/Dashboard.tsx` | Add `<SystemStatusBanner />` above banners |

