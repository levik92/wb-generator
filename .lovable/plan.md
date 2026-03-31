

# Plan: Fix and Finalize Tochka Bank Integration

## Problems Found in Current Code

1. **`customerCode` set to `accountId`** -- wrong. Must be fetched via `GET /open-banking/v1.0/customers` API at startup
2. **`unitCode: "услуга"`** -- API requires `"услуга."` (with period)
3. **`type: "individual"`** -- API only accepts `"ip"` or `"company"`
4. **Amounts as numbers** -- Tochka curl example passes them as strings (`"1234.56"`)
5. **`tochka-webhook` missing from `config.toml`** -- needs `verify_jwt = false` (public endpoint)
6. **`create-tochka-invoice` missing from `config.toml`** -- needs `verify_jwt = false` (validates JWT in code)
7. **Webhook double-update bug** -- updates invoice to `paid` manually, then calls `process_invoice_payment` RPC which also updates to `paid` and will fail with "Invoice not found" because the status already changed
8. **No auto-fill buyer data by INN** -- Tochka has `GET /invoice/v1.0/counterparty/{inn}` to look up company details by INN

## Changes

### 1. `supabase/config.toml`
Add entries for both new functions:
```toml
[functions.create-tochka-invoice]
verify_jwt = false

[functions.tochka-webhook]
verify_jwt = false
```

### 2. `supabase/functions/create-tochka-invoice/index.ts`
- **Fetch `customerCode`** dynamically: call `GET /open-banking/v1.0/customers` with the bearer token, find the customer whose account matches `TOCHKA_ACCOUNT_ID`, extract `customerCode`
- **Fix `unitCode`**: `"услуга"` -> `"услуга."`
- **Fix `type`**: `"individual"` -> `"ip"` (for 12-digit INN)
- **Convert amounts to strings** for the Tochka API body
- **Add counterparty lookup**: before building the invoice body, call `GET /invoice/v1.0/counterparty/{inn}` to auto-fill buyer's bank details, legal address, KPP, name if available (user-provided data takes priority as override)

### 3. `supabase/functions/tochka-webhook/index.ts`
- **Fix double-update bug**: remove the manual status update before `process_invoice_payment` RPC call. The RPC already handles status update + token credit + notifications. Only use fallback (`refund_tokens`) if the RPC fails, and remove the broken `admin_update_user_tokens` call (which requires admin role check via `auth.uid()`)

### 4. `src/components/dashboard/InvoiceForm.tsx`
- **Add INN auto-lookup**: when user enters 10 or 12 digit INN and tabs out, call the edge function to look up counterparty data and auto-fill name, KPP, legal address, bank details
- Add loading indicator during lookup

### 5. New Edge Function: `supabase/functions/lookup-counterparty/index.ts`
- Authenticated endpoint that proxies `GET /invoice/v1.0/counterparty/{inn}` from Tochka API
- Returns company name, KPP, legal address, bank details
- Called from InvoiceForm on INN blur

## How It Works (for the user)

1. User opens invoice form, enters ИНН
2. System auto-fills company name, КПП, address, bank details from Tochka's counterparty database
3. User reviews, adjusts if needed, clicks "Сформировать счёт"
4. Edge function creates invoice in DB + sends to Tochka API
5. Tochka generates official invoice with `documentId`
6. When buyer pays, Tochka sends `incomingPayment` webhook
7. Webhook matches invoice by number in payment purpose, validates amount, auto-credits tokens

### Webhook Registration (manual, one-time)
After deployment, register via curl:
```bash
curl -X PUT "https://enter.tochka.com/uapi/webhook/v1.0/{TOCHKA_CLIENT_ID}" \
  -H "Authorization: Bearer {TOCHKA_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"webhooksList":["incomingPayment"],"url":"https://xguiyabpngjkavyosbza.supabase.co/functions/v1/tochka-webhook"}'
```

## Files

| File | Action |
|------|--------|
| `supabase/config.toml` | Add function entries |
| `supabase/functions/create-tochka-invoice/index.ts` | Fix customerCode, unitCode, type, amounts |
| `supabase/functions/tochka-webhook/index.ts` | Fix double-update bug |
| `supabase/functions/lookup-counterparty/index.ts` | New -- proxy counterparty search by INN |
| `src/components/dashboard/InvoiceForm.tsx` | Add INN auto-lookup |

