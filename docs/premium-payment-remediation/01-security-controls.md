# Security Controls

## Payment Authority

Clients now send a product id, not an amount, duration, or entitlement type. Supabase initializes Paystack from `paid_products`, creates a `payment_attempts` row, and stores the expected amount/currency/reference before checkout starts.

## Paystack Verification

`verify-paystack-transaction` accepts only a Paystack reference. It loads the authenticated user's matching server-created attempt, verifies the Paystack transaction, checks reference, amount, currency, and status, then calls `process_verified_payment`.

## Webhooks and Replay Protection

`paystack-webhook` verifies `x-paystack-signature` with `PAYSTACK_SECRET_KEY` and records the event in `provider_webhook_events`.

`revenuecat-webhook` records each RevenueCat event in the same event ledger and ignores duplicates.

## Entitlements

Premium access is granted through `entitlements` and mirrored to `profiles` and `subscriptions` for compatibility. Premium-gated identity surfaces now use RPCs that return locked placeholder rows for free users.

## Wallet

Wallet top-ups are fixed catalog products. Wallet Premium purchase and withdrawal holds are handled by RPCs with row locks and ledger entries.

## Android Policy

The Android shell no longer offers Paystack wallet top-up for digital features. Android subscriptions/consumables remain RevenueCat/Google Play Billing territory.

