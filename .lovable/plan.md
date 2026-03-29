

## Audit Results: B2B Invoice System

### What Works Correctly
1. **Database schema** — `invoice_payments`, `organization_details` tables are properly configured with correct columns, constraints, and unique key on `user_id`
2. **RLS policies** — Both tables have proper policies (users see own data, admins see all, users can create/update own)
3. **Invoice numbering** — `invoice_number_seq` sequence exists, RPC `nextval_invoice_number` works, prefix is `WBG-`
4. **Font support** — `arialFont.ts` has both `ARIAL_REGULAR_BASE64` and `ARIAL_BOLD_BASE64` exports
5. **PDF generation** — Properly registers Arial font, uses thin lines (0.15), includes contract terms, supplier info, signature
6. **Electronic invoice UI** — Matching layout with bank details, contract terms, status badges, "Я оплатил" button
7. **Payment history** — Fetches both `payments` and `invoice_payments`, shows combined chronological list
8. **Invoice creation flow** — Upserts org data, generates invoice number, inserts record, opens in new tab
9. **Admin processing** — `process_invoice_payment` RPC correctly handles approve/reject with token crediting
10. **AI prompt in DB** — `inn_lookup` prompt exists in `ai_prompts` table

### Issues Found

#### 1. CRITICAL: `lookup-inn` Edge Function Returns "not_found" for All INNs
- **Tested**: Called with INN `9724238597` (your own company) and `7707083893` (Sberbank) — both returned `{"error":"not_found"}`
- **Root cause**: The function has zero log output beyond "booted", meaning the AI gateway call is either failing silently or the model name `google/gemini-3.1-pro-preview` is returning empty/invalid responses
- **The catch block** on line 105-107 swallows all errors and returns `not_found` with no logging
- **Fix**: Add `console.error` logging before the AI call and after receiving the response. Also add a fallback model or validate the AI response. Need to add detailed logging to diagnose the exact failure point.

#### 2. MINOR: Model name may need verification
- The model `google/gemini-3.1-pro-preview` is used — same as in `support-chat`. If support chat works, the model is valid, but the INN lookup task may need a different prompt approach since Gemini may refuse to provide organization data it's not confident about.

### Proposed Fixes

**File: `supabase/functions/lookup-inn/index.ts`**
- Add detailed `console.log` statements for: prompt sent, AI response status, raw AI text, parsed JSON
- Log AI gateway errors with response body text
- Consider using a simpler model like `google/gemini-2.0-flash` for faster/more reliable responses
- Add proper error differentiation so users know why lookup failed (API error vs not found vs rate limit)

**No other files need changes** — the rest of the system (forms, PDF, history, admin) is correctly wired up.

### Technical Details

The edge function needs these specific logging additions:
1. Before AI call: log the constructed prompt
2. After AI response: log `aiRes.status` and response body if not OK
3. After parsing: log the raw text and parsed result
4. In catch block: log the actual error object

Additionally, the model should be changed from `google/gemini-3.1-pro-preview` to `google/gemini-2.0-flash` which is more reliable for structured data extraction tasks.

After deploying these changes, a re-test via `curl_edge_functions` will confirm whether the INN lookup works.

