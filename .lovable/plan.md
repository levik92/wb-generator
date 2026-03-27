

## Safari Admin Panel Issues — Root Cause & Fix

### Problem
Two distinct Safari-specific issues:

1. **Chart tooltips only work on click, not hover** — caused by the custom `Tooltip` component in `src/components/ui/tooltip.tsx`. It overrides Radix's default hover behavior and adds `onClick`/`onTouchEnd` toggle logic. Recharts uses its OWN `Tooltip` (not Radix), so this isn't the direct cause for charts — but the Recharts tooltip uses `backdrop-blur-sm` in its content div, which Safari composites incorrectly over the chart's SVG, blocking pointer events from reaching the chart area beneath.

2. **"Layer on top" feeling across the admin** — the sticky header on line 205 of `Admin.tsx` uses `backdrop-blur-xl`. In Safari, `backdrop-blur` creates a compositing layer that can intercept pointer events and cause rendering glitches with elements underneath (especially SVG charts in scrollable containers). Combined with `GlassCard` (`backdrop-blur-xl`), `AdminSidebar` (`backdrop-blur-xl`), and `DashboardHeader` (`backdrop-blur-xl`), there are multiple stacking blur layers competing.

### Fix (minimal, no visual change)

**File 1: `src/pages/Admin.tsx`** (line 205)
- Replace `backdrop-blur-xl` on the sticky header with a solid `bg-card` background
- The visual difference is negligible (card already has ~95% opacity), but eliminates the compositing layer that blocks interactions

```
// Before
bg-card/50 backdrop-blur-xl sticky top-0 z-20

// After  
bg-card sticky top-0 z-20
```

**File 2: `src/components/dashboard/AdminAnalyticsChart.tsx`** (line 317)
- Remove `backdrop-blur-sm` from chart tooltip div
- Replace with solid background

```
// Before
bg-background/95 backdrop-blur-sm

// After
bg-background
```

**File 3: `src/components/dashboard/AdminBreakdownChart.tsx`**
- Same tooltip fix — check for `backdrop-blur` in its custom tooltip and remove it

**File 4: `src/components/admin/AdminSidebar.tsx`** (line 50)
- Replace `bg-card/80 backdrop-blur-xl` with `bg-card`

**File 5: `src/components/dashboard/GlassCard.tsx`** (line 36)
- Replace `bg-card/80 backdrop-blur-xl` with `bg-card`

### What this does NOT change
- No visual design changes — solid backgrounds at these opacity levels look identical
- No functional changes — only removes CSS properties that Safari handles poorly
- Dashboard header, landing page, and other non-admin pages are untouched (per user: "в остальных вроде все ок")

### Why this works
Safari's WebKit engine creates GPU-composited layers for `backdrop-blur`. When multiple such layers overlap (sidebar + header + cards + chart tooltips), it causes:
- Pointer event passthrough failures (hover doesn't register on charts)
- Input lag and "heavy" feel when interacting with elements under blur layers
- Tooltip rendering delays

Removing blur from the admin panel's structural elements eliminates these compositing conflicts while maintaining the same visual appearance.

