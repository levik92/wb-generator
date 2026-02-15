

## Plan: Breakdown Charts for AI Requests and Tokens by Type

### Overview
Replace the current single-line "Запросы к AI" and "Потрачено токенов" charts with multi-line breakdown charts showing data split by category (images, descriptions, video). Each chart will show:
- Total number at the top (sum of all types)
- Three colored lines with a legend at the bottom
- No comparison period (previous period lines removed)

### Data Sources
The breakdown will come from:
- **Images (cards)**: `generations` table where `generation_type = 'cards'` + `generation_jobs` for token costs
- **Descriptions**: `generations` table where `generation_type = 'description'`
- **Video**: `video_generation_jobs` table (separate table)

For tokens:
- **Images tokens**: `generation_jobs.tokens_cost` (linked to card generations)
- **Description tokens**: `generations.tokens_used` where type = 'description'
- **Video tokens**: `video_generation_jobs.tokens_cost`

### Changes

#### 1. Edge Function: `supabase/functions/admin-analytics/index.ts`
- Fetch `generations` split by `generation_type` ('cards' vs 'description') for the period
- Fetch `video_generation_jobs` for the period
- Return new breakdown fields in response:
  - `generationsByType`: `{ cards: ChartData[], descriptions: ChartData[], video: ChartData[] }`
  - `tokensByType`: `{ cards: ChartData[], descriptions: ChartData[], video: ChartData[] }`
  - `totalsByType`: `{ generationsCards, generationsDescriptions, generationsVideo, tokensCards, tokensDescriptions, tokensVideo }`
- Keep existing `generations` and `tokens` charts unchanged for backward compatibility
- Skip fetching previous period data for these new breakdown charts

#### 2. Frontend: `src/components/dashboard/AdminAnalyticsChart.tsx`
- Add a new component `AdminBreakdownChart` that:
  - Accepts `type: 'generations' | 'tokens'`
  - Uses `AreaChart` with 3 `Area` lines in different colors:
    - Images: `#8b5cf6` (purple)
    - Descriptions: `#06b6d4` (cyan)  
    - Video: `#f59e0b` (amber)
  - Shows total sum at the top as the main number
  - Has a legend at the bottom with colored dots + labels
  - Has its own date range picker (same pattern as existing charts)
  - No previous period comparison line
  - Custom tooltip showing all 3 values

#### 3. Frontend: `src/components/admin/AdminAnalytics.tsx`
- Replace the existing `AdminAnalyticsChart type="generations"` and `type="tokens"` with the new `AdminBreakdownChart` components
- Keep `AdminAnalyticsChart type="users"` and `type="revenue"` as they are

### Colors
| Category | Color | Label |
|---|---|---|
| Изображения | #8b5cf6 (purple) | Изображения |
| Описания | #06b6d4 (cyan) | Описания |
| Видео | #f59e0b (amber) | Видео |

### Technical Notes
- The edge function uses `fetchAllRows` for pagination (existing pattern)
- Video data comes from `video_generation_jobs` table (not in `generations`)
- Token amounts: for cards use `generation_jobs.tokens_cost`, for descriptions use `generations.tokens_used`, for video use `video_generation_jobs.tokens_cost`
- Since `token_transactions` has no type breakdown in description, we derive token costs from the source tables directly

