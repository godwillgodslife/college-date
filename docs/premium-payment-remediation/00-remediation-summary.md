# Premium and Payment Remediation Summary

Date: 2026-07-21

This remediation moves payment and entitlement authority out of the browser and into Supabase database functions plus Edge Functions. The local code is updated, but nothing in this pass was deployed.

## Implemented

- Added server-owned paid product catalog in `paid_products`.
- Added server-created `payment_attempts` with expected amount, currency, provider, reference, and lifecycle status.
- Added `entitlements` as the authoritative Premium/feature access ledger.
- Added `wallet_ledger` for immutable wallet credit/debit/hold entries.
- Added `provider_webhook_events` for Paystack and RevenueCat event idempotency.
- Added `process_verified_payment` so verified Paystack payments are processed atomically.
- Added `purchase_premium_with_wallet` so wallet deduction and Premium activation happen in one transaction.
- Added `request_wallet_withdrawal` so withdrawal holds are created atomically.
- Added secure Premium-gated RPCs:
  - `get_profile_viewers_secure`
  - `get_admirers_secure`
- Added backend Paystack initialization:
  - `initialize-paystack-payment`
- Replaced Paystack verification with reference-only verification against server-created attempts.
- Added signed Paystack webhook handler:
  - `paystack-webhook`
- Hardened RevenueCat webhook with event ledger and entitlement writes.
- Updated Premium, Wallet, Settings, Viewers, Requests, and Chat UI paths to use the new backend gates.
- Disabled Android Paystack wallet funding for digital-goods policy safety.
- Added `npm run payment:remediation:test`.

## Not Deployed

The database migration and Edge Functions have not been deployed. Provider dashboards were not changed. No production payment or Android release build was run.

