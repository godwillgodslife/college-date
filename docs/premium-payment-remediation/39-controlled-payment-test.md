# Controlled Payment Test

Date: 2026-07-21

Status: Blocked

## Test Scope

No real payment test was run.

## Reason

The controlled payment test must only occur after:

- Production backup is confirmed.
- Migration succeeds.
- Required secrets are configured.
- Edge Functions are deployed.
- Paystack webhook points at the updated `paystack-webhook`.
- RevenueCat webhook compatibility is confirmed.
- RLS verification passes.
- Frontend production deployment succeeds.

These gates did not pass.

## Planned Test

Use one dedicated production test account and the lowest valid production product:

- Product: `premium_monthly`
- Amount: NGN 2,900
- Currency: NGN
- Flow: backend initialization -> Paystack checkout -> callback/webhook verification -> one entitlement set -> premium active after refresh/relogin

## Required Assertions

- Exactly one payment attempt.
- Exactly one provider reference.
- Correct amount charged.
- Correct currency.
- Exactly one entitlement per entitlement key/source/reference.
- Correct expiration.
- One webhook event record.
- Audit log created.
- Replay does not extend Premium.
- Same reference cannot fund wallet twice.
- Another user cannot use the reference.

## Result

Not started.
