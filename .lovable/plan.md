

# Plan: Fix Polza Video Generation — Wrong Model ID

## Problem
Error: `Модель "kling-v2-6" не найдена`. The model ID `kling-v2-6` is invalid on Polza AI. According to Polza docs, valid Kling models are:
- `kling/v3` — Kling 3.0 (latest, 3-15 sec, mode: std/pro, sound support)
- `kling/v2.5-turbo` — Kling 2.5 Turbo (5 or 10 sec)

## Solution
Update both video functions to use `kling/v3` and fix the request body to match Polza's API format for Kling 3.0.

### Changes in `create-video-job-polza/index.ts` and `regenerate-video-job-polza/index.ts`:

**Before:**
```json
{
  "model": "kling-v2-6",
  "input": {
    "prompt": "...",
    "images": [{ "type": "url", "data": "..." }],
    "aspect_ratio": "3:4",
    "duration": "5",
    "mode": "std"
  }
}
```

**After (per Polza docs for Kling 3.0):**
```json
{
  "model": "kling/v3",
  "input": {
    "prompt": "...",
    "images": [{ "type": "url", "data": "..." }],
    "aspect_ratio": "9:16",
    "duration": 5,
    "mode": "std",
    "sound": "false"
  },
  "async": true
}
```

Key differences:
1. Model: `kling-v2-6` → `kling/v3`
2. `duration`: string `"5"` → number `5`
3. `aspect_ratio`: `"3:4"` → `"9:16"` (Kling 3.0 supports 16:9, 9:16, 1:1 only — no 3:4)
4. Add required `sound: "false"`
5. Add `async: true` for proper async handling

## Files
1. `supabase/functions/create-video-job-polza/index.ts` — line ~115-124
2. `supabase/functions/regenerate-video-job-polza/index.ts` — line ~137-146

