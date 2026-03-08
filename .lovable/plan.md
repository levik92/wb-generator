

# Fix: Main generation with 1 card incorrectly shows per-card animation after page return

## Problem
When you start a **main generation** (even with 1 card) and leave the page, upon returning the system incorrectly shows the per-card animation (as if it's a regeneration) instead of the full progress bar.

**Root cause**: The `checkForActiveJobs` logic on line 346 uses this condition:
```text
isSingleCardRegen = (total_cards === 1) AND (previous completed job exists)
```
But a main generation can also have `total_cards=1`, and if there's any completed job from the last 24 hours, it gets misidentified as a regeneration.

The regeneration edge functions (`regenerate-single-card-v2`, `regenerate-single-card-banana`) create jobs with the product's category (e.g. "Electronics"), not `'edit'`, so the query that filters `.neq('category', 'edit')` picks them up as if they were main generations.

## Solution

### 1. Mark regeneration jobs with a distinct category
Update both edge functions to use `category: 'regeneration'` instead of the product category:
- `supabase/functions/regenerate-single-card-v2/index.ts` -- change `category: sanitizedCategory` to `category: 'regeneration'`
- `supabase/functions/regenerate-single-card-banana/index.ts` -- same change

### 2. Update `checkForActiveJobs` in GenerateCards.tsx
- Change the query filter from `.neq('category', 'edit')` to `.not('category', 'in', '("edit","regeneration")')` so it only picks up true main generation jobs
- Remove the flawed `isSingleCardRegen` heuristic -- after the fix, any job returned by this query is guaranteed to be a main generation, so always show the full progress bar
- Update the edit jobs query section to also check for active `'regeneration'` category jobs (in addition to `'edit'`) to restore per-card animation for those

### 3. Update active edit jobs restoration block
The section starting at line 427 that checks for active edit jobs should also look for `category: 'regeneration'` jobs, so if a regeneration is in progress when the user returns, the per-card animation is shown correctly.

## Technical Details

**Files to modify:**
- `supabase/functions/regenerate-single-card-v2/index.ts` (line 194: `category: 'regeneration'`)
- `supabase/functions/regenerate-single-card-banana/index.ts` (line 148: `category: 'regeneration'`)
- `src/components/dashboard/GenerateCards.tsx`:
  - Line 205: filter to exclude both 'edit' and 'regeneration' categories
  - Lines 331-424: simplify -- remove `isSingleCardRegen` branch, always show full progress bar since only main jobs pass the filter
  - Lines 427-440: expand `.eq('category', 'edit')` to `.in('category', ['edit', 'regeneration'])` to catch active regen jobs for per-card animation

