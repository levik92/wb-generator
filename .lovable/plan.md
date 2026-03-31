

# Plan: Tochka Bank Invoice Automation + Webhook Payment Processing

## Overview

Automate B2B invoice creation via Tochka Bank API and auto-credit tokens when payment is received via bank webhook.

## Current State

- Invoice form (`InvoiceForm.tsx`) saves org data to `organization_details`, creates a record in `invoice_payments`, and opens a PDF page
- Invoice is generated client-side as PDF via jsPDF
- Payment confirmation is manual: user clicks "Я оплатил" → admin reviews in admin panel → manually approves
- Seller details are hardcoded in `InvoicePage.tsx` (ООО АЛЬТАИР, ИНН 9724238597, bank Точка)

## Architecture

```text
┌─────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│ InvoiceForm │────▶│ create-tochka-invoice│────▶│ Tochka API       │
│ (frontend)  │     │ (Edge Function)      │     │ POST /bills      │
└─────────────┘     └──────────────────────┘     └──────────────────┘
                            │                           │
                            ▼                           │
                    ┌──────────────┐                     │
                    │invoice_payments│                    │
                    │(tochka_doc_id)│                    │
                    └──────────────┘                     │
                                                        │
┌──────────────────┐     ┌─────────────────────────┐    │
│ Tochka Bank      │────▶│ tochka-webhook          │◀───┘
│ incomingPayment  │     │ (Edge Function)         │
│ webhook          │     │ matches by ИНН + сумма  │
└──────────────────┘     │ + номер счёта           │
                         └──────────┬──────────────┘
                                    ▼
                         ┌──────────────────┐
                         │ Auto-credit      │
                         │ tokens to user   │
                         └──────────────────┘
```

## Step 1: Add Secrets

Request two secrets from the user:
- `TOCHKA_API_TOKEN` — Bearer token for Tochka API (OAuth2)
- `TOCHKA_CLIENT_ID` — Application client_id for webhook management
- `TOCHKA_ACCOUNT_ID` — Bank account identifier (e.g., `40702810120000295325/044525104`)
- `TOCHKA_CUSTOMER_CODE` — Customer code from Get Customers List

## Step 2: Database Migration

Add columns to `invoice_payments`:
- `tochka_document_id` (text, nullable) — documentId returned by Tochka
- `tochka_status` (text, nullable) — payment status from Tochka (`payment_waiting`, `payment_paid`, `payment_expired`)

## Step 3: Edge Function — `create-tochka-invoice`

New edge function that:
1. Receives authenticated request with invoice data (org details, package info)
2. Saves org data to `organization_details`
3. Creates invoice record in `invoice_payments`
4. Calls Tochka API `POST https://enter.tochka.com/uapi/invoice/v1.0/bills` with:
   - `accountId` — from secret
   - `customerCode` — from secret
   - `SecondSide` — buyer's ИНН, КПП, name, address, bank details
   - `Content.Invoice` — position name, amount, number, payment purpose
5. Saves returned `documentId` to `invoice_payments.tochka_document_id`
6. Returns invoice number and document ID

**Tochka API request body:**
```json
{
  "Data": {
    "accountId": "SELLER_ACCOUNT_ID",
    "customerCode": "SELLER_CUSTOMER_CODE",
    "SecondSide": {
      "taxCode": "BUYER_INN",
      "type": "company",
      "secondSideName": "BUYER_NAME",
      "kpp": "BUYER_KPP",
      "legalAddress": "BUYER_ADDRESS",
      "accountId": "BUYER_RS/BUYER_BIK",
      "bankName": "BUYER_BANK",
      "bankCorrAccount": "BUYER_KS"
    },
    "Content": {
      "Invoice": {
        "Positions": [{
          "positionName": "Пополнение тарифа ...",
          "unitCode": "услуга.",
          "ndsKind": "without_nds",
          "price": AMOUNT,
          "quantity": 1,
          "totalAmount": AMOUNT
        }],
        "totalAmount": AMOUNT,
        "number": "WBG-XXXX",
        "comment": "Без НДС",
        "paymentExpiryDate": "+5 days"
      }
    }
  }
}
```

## Step 4: Edge Function — `tochka-webhook`

Public endpoint (no JWT) that:
1. Receives `incomingPayment` webhook from Tochka
2. Payload contains `SidePayer` (ИНН, name, amount) and `purpose` (payment description)
3. Parses invoice number from `purpose` field (regex for `WBG-\d+`)
4. Looks up `invoice_payments` by invoice_number + amount + payer ИНН
5. If match found:
   - Updates `invoice_payments.status` → `paid`, `tochka_status` → `payment_paid`
   - Calls existing `process_payment_success` or equivalent RPC to credit tokens
   - Creates notification for the user
   - Logs security event
6. Returns 200 OK (Tochka requires 200 response)

## Step 5: Update Frontend

**InvoiceForm.tsx:**
- Change `handleCreateInvoice` to call `create-tochka-invoice` edge function instead of direct DB inserts
- Show success with invoice number

**InvoicePage.tsx:**
- Remove "Я оплатил" button — payments are now auto-detected
- Add info banner: "Оплата будет зачислена автоматически после поступления средств"
- Keep PDF download functionality

## Step 6: Webhook Registration (Manual)

After deployment, the user needs to register the webhook URL in Tochka:
```
PUT https://enter.tochka.com/uapi/webhook/v1.0/{client_id}
{
  "webhooksList": ["incomingPayment"],
  "url": "https://xguiyabpngjkavyosbza.supabase.co/functions/v1/tochka-webhook"
}
```
This can be done via curl or we can create a one-time admin action.

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/...` | Add `tochka_document_id`, `tochka_status` to `invoice_payments` |
| `supabase/functions/create-tochka-invoice/index.ts` | New — creates invoice via Tochka API |
| `supabase/functions/tochka-webhook/index.ts` | New — processes incoming payment webhooks |
| `src/components/dashboard/InvoiceForm.tsx` | Call edge function instead of direct inserts |
| `src/pages/InvoicePage.tsx` | Remove manual confirmation, add auto-payment info |

## Security Considerations

- Webhook endpoint is public but validates payment data (ИНН + amount + invoice number match)
- All token credits go through existing `process_invoice_payment` RPC with service_role
- Security events logged for every webhook call

