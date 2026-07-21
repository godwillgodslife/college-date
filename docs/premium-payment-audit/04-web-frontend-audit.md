# Web Frontend Audit

## Confirmed Existing Behavior

- Web Premium uses Paystack Inline through `initializePaystack`.
- The web flow creates a pending `wallet_transactions` row from the browser, then calls `verify-paystack-transaction` after Paystack callback.
- The Premium page also allows wallet-funded Premium when wallet balance is at least NGN 2,900.
- Web boosts use wallet/RPC purchase via `purchaseBoost`.
- Wallet funding creates a client-side pending deposit row, opens Paystack, then verifies through the same Edge Function.
- Settings exposes "Restore Purchase" using Paystack status verification.

## Bugs and Inconsistencies

- Premium page copy says free users get 10 swipes/day, while `Match.jsx`, `AuthContext.jsx`, and the swipe limit RPC use 20.
- Premium page claims "Weekly Boost" but no weekly boost grant scheduler/job was found.
- Premium page says advanced filters are Premium, but `Match.jsx` exposes gender/university/age filters without a premium check.
- Wallet funding description says Flutterwave while the code uses Paystack.
- The Paystack callback success state depends on frontend execution. There is no Paystack webhook fallback in the repo.
- Duplicate click prevention is UI-only through `isProcessing`; backend idempotency is incomplete for Paystack transactions.

## Failure and Recovery

| Scenario | Current behavior | Risk |
|---|---|---|
| Payment succeeds, frontend closes before callback | No Paystack webhook found | User can pay without wallet/Premium activation |
| Payment succeeds, entitlement update fails | Toast says contact support | Manual recovery needed |
| User refreshes during checkout | Pending transaction remains | Admin sees pending payment, no automatic recovery |
| Invalid reference | Verification marks tx failed | Good, but can mark legitimate row failed if wrong ref entered |
| Reused reference | Unique `reference_id` may block if already recorded | Not enough explicit idempotency |
| Already premium buys again | UI does not show purchase button when active | Backend still could allow new transaction |

## Recommended Web Fixes

- Move transaction creation for deposits/subscriptions into backend functions with server-owned plan catalog.
- Add Paystack webhook with signature verification and idempotent transaction reconciliation.
- Make restore verify authenticated user, original transaction age, plan duration, and existing entitlement.
- Align copy and backend free limits.
- Show provider-derived payment state and support reference on activation failures.
