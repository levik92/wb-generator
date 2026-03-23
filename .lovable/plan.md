

# Fix: Deduplication logic drops referral with commission data

## Problem
For partner `cat.web@mail.ru`, client `cherryden666@gmail.com` has 2 duplicate referral records:
- Record 1 (`e0eecceb`, 14:34:26.917): status=active, total_payments=990, total_commission=198, has commission records
- Record 2 (`a5cf04c8`, 14:34:27.204): status=registered, total_payments=0, total_commission=0, no commissions

The dedup logic keeps the **latest by date** — Record 2 (the empty one). Record 1 with all the payment data gets discarded.

Additionally, `invited_clients_count = 2` in `partner_profiles` is wrong (should be 1).

## Plan

### 1. Fix deduplication logic in AdminPartners.tsx
Change the dedup comparator to prefer the record with higher `total_commission` (or `total_payments`), falling back to latest date only when equal. This ensures the record with actual data is kept.

In both the main path (line ~184) and fallback path (line ~214):
```
// Keep record with more commission data; if equal, keep latest
const existing = uniqueMap.get(r.referred_user_id);
if (!existing || r.total_commission > existing.total_commission || 
    (r.total_commission === existing.total_commission && new Date(r.registered_at) > new Date(existing.registered_at))) {
  uniqueMap.set(r.referred_user_id, r);
}
```

Also merge `payments` arrays from duplicates so no commission records are lost.

### 2. Fix the duplicate referral data
Use the insert tool to delete the duplicate empty referral record (`a5cf04c8`) and fix `invited_clients_count` to 1.

### 3. Fix the edge function dedup (optional but recommended)
Also merge payments from duplicate referrals in `get-partner-referrals/index.ts` server-side, so the response already contains consolidated data.

## Files to modify
- `src/components/admin/AdminPartners.tsx` — fix dedup logic (lines ~182-198)

## Database fixes
- DELETE duplicate referral `a5cf04c8-6665-459e-b299-184b74c4bc6f`
- UPDATE `partner_profiles` SET `invited_clients_count = 1` WHERE `id = '4ee91fc4-9280-4f3a-96c2-87b6c35e6e23'`

