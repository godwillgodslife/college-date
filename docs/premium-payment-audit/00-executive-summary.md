# Premium and Payment Audit Executive Summary

Audit date: 2026-07-21
Scope: Web app, Capacitor Android app, Supabase Edge Functions, local SQL/migrations, admin finance surfaces, wallet economy, RevenueCat/Google Play and Paystack integration points.

## Readiness Rating

Requires Important Fixes

The payment system is partially implemented and has working production paths, but it is not yet clean enough for aggressive promotion or production-scale billing without remediation. Android Premium has a valid RevenueCat path in the app, and web Paystack checkout verifies transactions server-side. However, several entitlement and lifecycle paths still trust client-created records or stale payment history, cancellation/refund handling is incomplete outside RevenueCat webhooks, and some Android wallet flows may conflict with Google Play policy for digital goods.

## Required Executive Answers

1. Web payments currently work: Partially. Web Paystack subscription and wallet funding can verify through `verify-paystack-transaction`, but the backend trusts the client-created transaction amount and type.
2. Android payments currently work: Partially. Native Premium uses RevenueCat/Google Play. Android boosts attempt RevenueCat purchases. Android wallet funding still uses Paystack, which needs policy review because wallet funds buy digital swipes/gifts.
3. Premium access is securely enforced: Not fully. Many UI checks use `hasActivePremium`, and swipe RPCs check premium server-side, but profile viewers and request reveal are frontend-only restrictions over readable data.
4. Web and Android remain synchronized: Partially. Shared Supabase state is used, but Android purchase sync depends on RevenueCat webhook timing. Restore purchase does not explicitly write Supabase.
5. Prices and plans are consistent: Mostly for the main monthly Premium amount (NGN 2,900), but free swipe copy conflicts (10/day vs 20/day), Google Play price is not verified from provider data, and RevenueCat logs hardcode NGN 2,900.
6. Subscription renewal and expiration work: Android RevenueCat webhook handles renewal/expiration/refund/revoke events. Web Paystack path grants 30 days but no real recurring renewal/cancellation lifecycle was found.
7. Cancellation and refunds work: RevenueCat refund/revoke events deactivate Premium. Web Paystack cancellation/refund handling was not found.
8. Webhooks are secure and reliable: RevenueCat webhook uses a shared Authorization secret, but lacks timestamp/signature replay protection and has incomplete idempotency. No Paystack webhook handler was found.
9. Database has a reliable source of truth: Not singular. Effective Premium is derived from `profiles.is_premium`, `profiles.premium_expires_at`, and `subscriptions`.
10. Users can bypass premium restrictions: Some. Backend protects swipe payments, but viewer identity/request reveal data appears fetchable by free users if RLS permits the same selects used by the UI.
11. Users can pay without receiving Premium: Yes. Paystack verification can complete transaction updates before entitlement writes; wallet subscription deducts before client-side entitlement writes.
12. Premium can remain active after cancellation, expiry, refund, or revocation: Yes for web Paystack because no provider lifecycle/webhook was found. For RevenueCat, refund/revoke are handled, but out-of-order/replay behavior is weak.
13. Ready for production billing: Not yet at scale. Keep current low-volume controlled testing, but fix critical backend validation and recovery gaps first.
14. Most urgent fixes: Backend-owned plan catalog, authenticated restore, Paystack webhook/idempotency, entitlement reconciliation job, backend gates for premium-only data, Android Play policy cleanup.

## Most Serious Findings

- F-001 Critical: Web Paystack verification trusts the client-created transaction amount and type.
- F-002 High: Paystack restore can re-grant 30 days from an old completed transaction.
- F-003 High: Premium-only viewers/hidden admirers are blurred in UI but data is still requested client-side.
- F-004 High: Android wallet Paystack funding can buy digital features and needs Google Play policy review.
- F-005 Medium: Android restore purchase does not explicitly synchronize Supabase entitlement.
- F-006 Medium: Free swipe limits are inconsistent between UI copy, admin config, and backend logic.
- F-007 Medium: RevenueCat webhook lacks strong replay protection and complete idempotent subscription ledger handling.
- F-008 Medium: Wallet subscription flow can deduct before entitlement activation succeeds.

## Unverified Access Required

- Google Play Console product, base plan, price, grace period, cancellation, and RTDN settings.
- RevenueCat dashboard offering/package/current offering state, webhook auth configuration, product mapping, and event history.
- Paystack dashboard production/subscription/webhook settings and refund/callback history.
- Live Supabase schema/RLS/policies/functions, because the local schema dump files are empty and Supabase CLI is not installed.
- Production logs and real transaction rows.
