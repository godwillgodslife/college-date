# Test Coverage and Test Plan

No real-payment tests were run.

## Existing Test Evidence

- `npm run build` and Android bundle builds are recorded in handoff history, but not run in this audit.
- No dedicated payment unit/integration/e2e test suite was found.

## Recommended Unit Tests

| Area | Cases |
|---|---|
| Premium helper | active flag, active subscription, expired period, null expiry, invalid expiry |
| Plan catalog | plan ID to amount/currency/provider |
| Paystack verification | amount mismatch, wrong currency, reused reference, wrong user |
| RevenueCat mapping | initial purchase, renewal, expiration, refund, cancellation |
| Usage limits | free user, premium user, reset boundary, failed RPC |
| Wallet RPCs | insufficient balance, auth mismatch, duplicate operation ID |

## Recommended Integration Tests

- Successful Paystack subscription from server-created intent.
- Paystack success with interrupted frontend callback, recovered by webhook.
- Paystack amount manipulation attempt.
- Paystack duplicate webhook.
- Wallet-funded Premium atomic success/failure rollback.
- RevenueCat purchase webhook creates entitlement.
- RevenueCat expiration/refund removes entitlement.
- RevenueCat duplicate event does not duplicate ledger.
- Android restore syncs Supabase.

## Recommended E2E Tests

- Free web user upgrades and immediately sees Premium features.
- Android user buys Premium and web reflects it after sync.
- Expired Premium user loses unlimited swipes.
- Free user cannot reveal viewers via direct API.
- Payment success but frontend redirect interrupted.
- Offline paid swipe queue does not double charge.
