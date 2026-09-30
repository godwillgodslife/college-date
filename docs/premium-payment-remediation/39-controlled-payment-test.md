# Controlled Payment Test

Date: 2026-07-25

Status: Blocked

## Test Scope

No real production payment was run.

## Reason

The controlled live payment test is blocked until provider dashboard configuration is directly confirmed:

- Paystack production webhook destination is user-confirmed.
- RevenueCat production webhook destination is user-confirmed.
- A dedicated test user and one intentional real payment action are required.

## Planned Test

Use one dedicated production test account and the lowest valid production product:

- Product: `premium_monthly`
- Amount: NGN 2,900
- Currency: NGN
- Flow: backend initialization -> Paystack checkout -> payment completion -> callback/webhook verification -> one entitlement set -> premium active after refresh/relogin

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

## Current Payment Tables

Pre-payment baseline captured at `2026-07-25 12:28:08.677776+00` after migration, function deploy, safe invalid probes, backfill, web deploy, and provider dashboard confirmation:

- `payment_attempts`: 0
- `provider_webhook_events`: 0
- `entitlements`: 0
- `wallet_ledger`: 0
- `payment_audit_logs`: 0
- Active Paystack attempts: 0

## No-Charge Initialization Test

Status: Passed

User approved a no-charge Paystack initialization test. The Premium page was opened on the live site and the Paystack checkout was initialized exactly once. No card, OTP, bank, transfer, or payment detail was entered.

Observed Paystack checkout:

- Host: `checkout.paystack.com`
- Product: `premium_monthly`
- Displayed amount: NGN 2,900
- Payment was not completed.

Sanitized production row details:

- `provider`: `paystack`
- `product_id`: `premium_monthly`
- `status`: `initialized`
- `expected_amount`: NGN 2,900.00
- `currency`: `NGN`
- Reference prefix: `CD-PREMIUMMONTHLY-...`
- Authorization host: `checkout.paystack.com`
- Created at: `2026-07-25 12:56:33.249194+00`
- Expires at: `2026-07-25 13:56:33.249194+00`
- Provider response message: `Authorization URL created`

Post-initialization aggregate counts:

- `payment_attempts`: 1
- Initialized premium Paystack attempts: 1
- `provider_webhook_events`: 0
- `entitlements`: 0
- `wallet_ledger`: 0
- `payment_audit_logs`: 0

## Result

Completed-payment verification remains blocked because no real payment was completed.
