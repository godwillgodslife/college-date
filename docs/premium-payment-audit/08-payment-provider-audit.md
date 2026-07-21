# Payment Provider Audit

## Paystack

Confirmed:

- Public key is read from `VITE_PAYSTACK_PUBLIC_KEY`.
- Secret key is read server-side as `PAYSTACK_SECRET_KEY`.
- Frontend uses Paystack Inline JS.
- Server verifies references with `https://api.paystack.co/transaction/verify/{reference}`.
- Currency is hardcoded to `NGN`.
- Amount is sent in kobo from frontend Paystack setup.

Risks:

- Transaction amount/type is created by the frontend before verification.
- No Paystack webhook handler was found.
- No Paystack signature validation was found because no webhook exists.
- Restore flow can grant new 30-day Premium from old completed transaction.
- No explicit customer/email/user metadata match is enforced in `verify-paystack-transaction`.

## RevenueCat / Google Play

Confirmed:

- Native app uses `@revenuecat/purchases-capacitor`.
- Android key is `VITE_REVENUECAT_ANDROID_KEY`, with runtime guard against `test_` keys.
- App user ID is Supabase user ID.
- Expected entitlement is `Premium`.
- Expected product prefix is `premium_monthly`; handoff/prototype expect `premium_monthly:monthly-base`.
- Webhook handles initial purchase, renewal, product change, expiration, refund, revoke, transfer.

Risks:

- Webhook trusts shared Authorization secret only; no timestamp/signature replay protection.
- Subscription transaction ledger does not pre-check duplicate `transaction_id`.
- Google Play price/currency is not read from provider event; ledger hardcodes NGN 2,900.
- Pending, grace period, account hold, and cancellation semantics are not fully modeled.
- No server-side RevenueCat customer sync endpoint found for restore/reinstall.

## Unsupported/Absent Providers

- Flutterwave: only stale text/comments found; no active integration.
- Stripe: no active integration found.
- Apple billing: iOS key guard exists, but no App Store product/config evidence.
- Bank transfer/manual payments: no implemented verified flow found.
