# Production Monitoring

Date: 2026-07-25

Status: Passed

## Monitoring Checklist

Temporary rollout checklist:

- Payment initialization
- Payment verification
- Paystack webhook
- RevenueCat webhook
- Entitlement creation
- Wallet ledger
- Premium access
- Callback page
- Edge Function errors
- Webhook failures
- Amount mismatches
- Currency mismatches
- Unknown references
- Duplicate events
- Entitlement failures
- Wallet failures
- RLS errors
- Frontend callback failures

## Initial Observations

Passed:

- Safe invalid function requests failed closed.
- Payment evidence tables remained unchanged after safe probes.
- Live website and key app routes returned HTTP 200.
- Payment callback route handled missing reference safely.
- Product catalogue and monetization config were readable from production.
- Built frontend assets did not expose provider or service-role secrets.

Warnings:

- Supabase CLI version available here does not expose function-log retrieval; provider/function log review must be completed from the Supabase dashboard if needed.
- Browser console showed OneSignal SDK timeout.
- Browser console showed auth safety timeout and realtime retry warnings.
- Live Paystack and RevenueCat provider dashboards were not verified.
- No controlled real payment has been run.

## Data Counters

Pre-payment baseline captured at `2026-07-25 12:28:08.677776+00` was clean:

- `payment_attempts`: 0
- `provider_webhook_events`: 0
- `entitlements`: 0
- `wallet_ledger`: 0
- `payment_audit_logs`: 0
- Active Paystack attempts: 0

After the approved no-charge initialization test:

- `payment_attempts`: 1
- Initialized premium Paystack attempts: 1
- `provider_webhook_events`: 0
- `entitlements`: 0
- `wallet_ledger`: 0
- `payment_audit_logs`: 0

## Next Monitoring Action

After provider dashboard confirmation and the first controlled payment, immediately inspect:

- The created `payment_attempts` row.
- The created entitlement rows.
- Paystack callback result.
- Paystack webhook event row.
- Payment audit log row.
- Browser callback behavior after refresh/relogin.
