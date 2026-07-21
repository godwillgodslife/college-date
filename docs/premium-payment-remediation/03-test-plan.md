# Test Plan

## Automated

- `npm run payment:remediation:test`
- `npm run build`

## Database

- Run migration on a non-production Supabase project first.
- Confirm RLS policies allow users to select only their own `payment_attempts`, `entitlements`, and `wallet_ledger` rows.
- Confirm authenticated users cannot insert/update/delete `wallet_transactions`, `payment_attempts`, `entitlements`, or `wallet_ledger` directly.
- Confirm `purchase_premium_with_wallet` rolls back fully if entitlement grant fails.

## Paystack

- Initialize `premium_monthly` and verify the returned amount is NGN 2,900 from the server catalog.
- Initialize each wallet top-up tier and verify credited wallet amount equals catalog amount.
- Replay a successful webhook and confirm it does not duplicate wallet credit or entitlements.
- Attempt to verify a reference with mismatched amount/currency and confirm attempt status becomes `mismatch`.

## RevenueCat

- Send duplicate webhook payloads and confirm only one event processes.
- Send purchase/renewal and confirm `entitlements`, `subscriptions`, and `profiles` align.
- Send expiration/refund/revoke and confirm Premium is expired/revoked.

## Premium Gates

- Free user:
  - `get_profile_viewers_secure` returns counts/locked rows only.
  - `get_admirers_secure` returns counts/locked rows only.
- Premium user:
  - both RPCs return identity details needed by the UI.

