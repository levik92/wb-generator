

# Plan: Auto-detect product name from uploaded image + Block image uploads during generation

## Overview

Two changes:
1. **Auto-detect product name**: When user uploads a product photo, send it to Gemini Flash for identification and auto-fill the "Название товара" field.
2. **Block image upload areas during generation**: Currently image upload zones remain interactive during generation -- lock them to prevent user mistakes.

## 1. New Edge Function: `identify-product`

Create `supabase/functions/identify-product/index.ts`:
- Receives a base64-encoded image
- Calls **Gemini 3.1 Flash Lite** (`gemini-3.1-flash-lite-preview`) via direct Google API using existing `GOOGLE_GEMINI_API_KEY`
- Prompt: "Определи товар на изображении. Верни только короткое название товара на русском языке (2-5 слов). Без описания, без кавычек."
- Returns `{ productName: string }`
- No token charge (free feature for UX improvement)
- Add to `supabase/config.toml` with `verify_jwt = true`

Why Flash Lite: cheapest model, text-only output from image input -- perfect for simple classification.

## 2. Frontend Changes in `GenerateCards.tsx`

### Auto-detect on image upload:
- After `validateAndAddFiles` succeeds and `productName` is empty, trigger auto-detection
- Add state: `isIdentifying` (boolean)
- Show a small spinner/badge "Определяю товар..." next to the product name field
- Convert the first uploaded file to base64, call `identify-product` edge function
- On success: set `productName` to the returned value (user can still edit)
- On failure: silently ignore, user fills manually

### Block image uploads during generation:
- The upload zones already have `generating` checks on drag handlers and `disabled={generating}` on inputs
- Currently lines 1612 and 1653 already apply `cursor-not-allowed opacity-60` when `generating`
- BUT: the remove buttons on uploaded files (line 1629, 1674) need `disabled={generating}` enforced visually (hide them during generation)
- The "Очистить" buttons (lines 1688-1698, 1713-1724) should also be disabled during generation

## 3. Cost Analysis

For auto-detection we'd use **Gemini 3.1 Flash Lite** (text-only output from image):
- **Input**: 1 image (560 tokens) + ~50 text tokens for prompt = ~610 input tokens
- **Input cost**: $0.125 / 1M tokens = **$0.000076 per request** (~0.007 руб.)
- **Output**: ~20 tokens (product name)
- **Output cost**: $0.75 / 1M tokens = **$0.000015 per request**
- **Total per request: ~$0.0001** (менее 0.01 руб. за запрос)

At 1000 генераций в день = ~$0.10/день = ~$3/месяц. Практически бесплатно, функция однозначно стоит того.

Для сравнения, если использовать **Gemini 3 Flash** (подороже):
- Input: $0.50/1M = $0.0003 за запрос
- Output: $3/1M = $0.00006
- Total: ~$0.0004 (~0.04 руб.) -- тоже копейки.

## Files to Create/Edit

| File | Action |
|------|--------|
| `supabase/functions/identify-product/index.ts` | Create |
| `supabase/config.toml` | Add function config |
| `src/components/dashboard/GenerateCards.tsx` | Add auto-detect logic + block uploads during generation |

