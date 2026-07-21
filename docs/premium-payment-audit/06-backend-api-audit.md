# Backend and API Audit

## Edge Function Inventory

| Endpoint | Method | Auth | Request | Provider | DB writes | Idempotency |
|---|---|---|---|---|---|---|
| `verify-paystack-transaction` | POST | Supabase JWT checked inside function | `transactionId`, `reference`, `metadata` | Paystack transaction verify | Updates `wallet_transactions`; credits wallet or grants Premium | Returns idempotent if tx already completed |
| `verify-paystack-status` | POST | Function likely JWT-gated, but no user check in code | `userId` | Paystack transaction verify | Updates profile/subscription Premium | Weak; reuses latest completed tx |
| `revenuecat-webhook` | POST | Shared Authorization secret, no Supabase JWT | RevenueCat payload | RevenueCat webhook payload only | Updates subscriptions/profiles/boosts/wallet_transactions | Partial for boost via transaction lookup; weak for subscription duplicates |

## RPC Inventory

| RPC | Purpose | Auth/authorization evidence | Risk |
|---|---|---|---|
| `process_swipe_payment` | Deduct wallet/free swipe for right swipe | Latest migration checks `auth.uid() = p_swiper_id` | Medium: free limit state split |
| `check_and_reset_swipe_limit` | Returns free swipe allowance and premium bypass | No explicit `auth.uid()` in local migration | Medium: caller can query others if executable |
| `decrement_wallet_balance` | Deduct wallet | Checks `auth.uid() = p_user_id` | Low |
| `increment_wallet_balance_admin` | Server wallet credit | Revoked from clients | Low |
| `purchase_boost` | Deduct wallet and create boost | Local setup file lacks auth check; live state unverified | High if deployed as-is |
| `send_super_swipe` | Consume Super Swipe and create swipe | Local current definition not found in migrations, but app calls it | UNVERIFIED |
| `process_gift_purchase` | Deduct gift price and reward receiver | Checks sender auth in migration | Low/Medium |
| `admin_get_transactions` | Finance ledger | Requires admin permission inside later migration | Medium, live state unverified |

## Backend Trust Problems

- Paystack verification compares paid amount to a client-created transaction row, so the browser currently influences amount, type, and description.
- Paystack restore extends access from historical completed transaction rows.
- RevenueCat subscription ledger hardcodes NGN 2,900 rather than reading provider price/currency.
- No backend-owned plan catalog table or constant map was found for web Paystack products.
- No Paystack webhook was found, so frontend callback is the only activation path.

## Required Backend Fixes

- Add backend `create-payment-intent` for subscription/deposit with server-owned amount/type/currency.
- Add Paystack webhook verification and event ledger.
- Add purchase/entitlement reconciliation table keyed by provider, provider transaction/subscription ID, user ID, product ID and period.
- Add a backend entitlement resolver function for all premium gates.
