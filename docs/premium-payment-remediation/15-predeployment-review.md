# Premium Payment Remediation Predeployment Review

Date: 2026-07-21

## Executive decision

Status: Blocked

The remediation should not be deployed to production yet. Local validation passed, but the only Supabase project visible from the CLI is the linked production project `gedoyoleoscgxgdqszzc` (`College Date`). No separate staging Supabase project was discovered, and the required sandbox/provider verification gates have not been completed.

No production database migration, Edge Function deployment, Netlify deployment, Android build, or provider dashboard change was performed during this pass.

## Scope reviewed

- Migration: `supabase/migrations/20260721120000_premium_payment_remediation_foundation.sql`
- Edge Functions:
  - `supabase/functions/initialize-paystack-payment`
  - `supabase/functions/verify-paystack-transaction`
  - `supabase/functions/verify-paystack-status`
  - `supabase/functions/paystack-webhook`
  - `supabase/functions/revenuecat-webhook`
- Frontend payment and entitlement surfaces:
  - premium upgrade
  - wallet purchase/deposit flows
  - payment callback
  - viewers/requests/chat entitlement gates
- Existing documentation:
  - `docs/premium-payment-remediation/00-remediation-summary.md`
  - `docs/premium-payment-remediation/01-security-controls.md`
  - `docs/premium-payment-remediation/02-rollout-checklist.md`
  - `docs/premium-payment-remediation/03-test-plan.md`
  - `docs/premium-payment-remediation/04-residual-risks.md`

## Local validation results

Status: Passed

- `npm run payment:remediation:test`: Passed.
- Targeted ESLint on payment/remediation files: Passed with warnings only.
- `npm run lint`: Passed with 98 warnings and 0 errors.
- `npm run build`: Passed.
- Deno type-check for the five payment-related Edge Functions: Passed after fixing a type annotation issue in webhook helper functions.

Build warning retained: the Agora chunk is still larger than the configured warning threshold. This is not a blocker for the payment remediation.

## Migration review

Status: Passed for static review, Blocked for deployment

The migration was reviewed for destructive operations. No `DROP TABLE`, `TRUNCATE`, or `DELETE FROM` statements were found. It does use controlled `drop policy if exists`, `revoke`, RLS enablement, new table creation, new RPC creation, grants, and seed/upsert operations.

Primary additions:

- `paid_products`
- `payment_attempts`
- `provider_webhook_events`
- `entitlements`
- `wallet_ledger`
- `payment_audit_logs`
- `monetization_config`
- `has_entitlement`
- `get_my_entitlements`
- `grant_paid_product_entitlements`
- `process_verified_payment`
- `purchase_premium_with_wallet`
- `request_wallet_withdrawal`
- `get_profile_viewers_secure`
- `get_admirers_secure`
- `get_monetization_config`

Primary risks to verify before production:

- Existing direct client writes to `wallet_transactions` may break after the new revoke rules if any call path was missed.
- Legacy direct reads from `swipes` still exist for discovery/match behavior. The most sensitive identity surfaces were moved to secure RPCs, but a full `swipes` RLS redesign remains residual work.
- The migration assumes the new tables and functions can coexist with the current live schema. This must be tested on a staging clone before production.

## Remote environment inspection

Status: Blocked for safe deployment

Supabase CLI project discovery found only one linked project:

- Project ref: `gedoyoleoscgxgdqszzc`
- Name: `College Date`
- Region: `eu-west-1`
- Status: `ACTIVE_HEALTHY`
- Role in current project handoff: production

The new migration `20260721120000` is local-only and has not been applied remotely.

Remote Edge Functions currently deployed:

- `send-notification-email`
- `send-notification-push`
- `notify-on-event`
- `verify-paystack-status`
- `revenuecat-webhook`
- `ai-profile-review`
- `ai-assistant`
- `verify-paystack-transaction`
- `zego-call-token`
- `agora-call-token`
- `admin-push-broadcast`

Not deployed remotely:

- `initialize-paystack-payment`
- `paystack-webhook`
- updated local versions of payment webhook functions

## Secret review

Status: Blocked

Secret names were inspected without recording secret values. The production Supabase project has payment-adjacent secrets, but the exact required backend name `PAYSTACK_SECRET_KEY` was not visible in the Supabase secret list. Older ambiguous secret names such as `Live Public Key` and `Live Secret Key` were visible, but the deployed functions expect exact environment variable names.

Required before staging or production function deployment:

- `PAYSTACK_SECRET_KEY`
- `PUBLIC_SITE_URL` or `SITE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REVENUECAT_WEBHOOK_AUTH`

The production deployment must not rely on ambiguous human-readable secret names.

## Predeployment gate

Status: Blocked

Required before production:

- A staging Supabase project or verified staging clone.
- Backup that can be restored.
- Backfill dry-run on staging.
- Edge Function deployment to staging.
- Paystack sandbox initialization, verification, webhook replay, duplicate replay, and failure-case testing.
- RevenueCat sandbox webhook replay and entitlement expiration/refund testing.
- RLS verification with authenticated free, premium, and unrelated-user accounts.
- Netlify preview smoke test against staging secrets.
- Android internal test build against staging or verified sandbox provider configuration.
