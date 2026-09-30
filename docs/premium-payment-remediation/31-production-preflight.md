# Production Preflight

Date: 2026-07-25

Status: Passed

## Environment

- Supabase project ref: `gedoyoleoscgxgdqszzc`
- Supabase project name: `College Date`
- Region: `eu-west-1`
- Database: PostgreSQL 17.6
- Netlify project: `collegedate4`
- Netlify project ID: `7ef7a935-0517-405d-b468-48e199caeb65`
- Netlify production URL: `https://www.thecollegedate.com`

## Migration History

`npx supabase migration list --linked` confirmed production is linked to `gedoyoleoscgxgdqszzc`.

Before rollout, remote migrations were present through:

- `20260716163000`

The production rollout applied:

- `20260721120000_premium_payment_remediation_foundation.sql`
- `20260725110000_premium_payment_remediation_grant_hardening.sql`

## Existing Tables Before Migration

Existing payment/premium adjacent public tables:

- `boosts`
- `profiles`
- `subscriptions`
- `transactions`
- `wallet_transactions`
- `wallets`

New remediation tables were not present before rollout:

- `paid_products`
- `payment_attempts`
- `provider_webhook_events`
- `entitlements`
- `wallet_ledger`
- `payment_audit_logs`
- `monetization_config`

No existing `payments` table was found.

## Existing Columns

Compatibility checks confirmed:

- `profiles.is_premium` exists.
- `profiles.premium_expires_at` exists.
- `profiles.last_active` exists.
- `subscriptions.user_id` exists and is unique.
- `subscriptions.plan_type`, `status`, and `current_period_end` exist.
- `wallets.user_id` exists and is unique.
- `wallet_transactions.reference_id` exists and is unique.

## Existing Functions

Existing payment-adjacent public RPCs before rollout:

- `decrement_wallet_balance(p_user_id uuid, p_amount numeric)`
- `increment_wallet_balance(p_user_id uuid, p_amount numeric)`
- `increment_wallet_balance_admin(p_user_id uuid, p_amount numeric)`
- `is_app_admin()`

New remediation RPCs were not present before rollout:

- `has_entitlement`
- `get_my_entitlements`
- `grant_paid_product_entitlements`
- `process_verified_payment`
- `purchase_premium_with_wallet`
- `request_wallet_withdrawal`
- `get_profile_viewers_secure`
- `get_admirers_secure`
- `get_monetization_config`

## Existing RLS Policies

RLS was enabled on existing public `profiles`, `subscriptions`, `wallet_transactions`, and `wallets`.

Existing wallet transaction policies allowed own-row operations by policy, but the remediation rollout now revokes direct insert/update/delete privileges from `anon` and `authenticated` on `wallet_transactions`.

## Production Counts

Manual logical snapshot counts before production writes:

- Profiles: 540
- `profiles.is_premium = true`: 0
- Active profile premium by expiration: 0
- Profiles with any `premium_expires_at`: 1
- Subscriptions: 476
- Premium subscriptions: 1
- Active premium subscriptions: 0
- Wallets: 517
- Wallets with balance or activity: 412
- Total available wallet balance: NGN 18,600.00
- Total pending wallet balance: NGN 1,500.00
- Wallet transactions: 171
- Completed wallet transactions: 128
- Completed Paystack wallet transactions: 128
- Duplicate non-null wallet transaction reference groups: 0
- `transactions` rows: 0

## Potential Conflicts

- Managed Supabase backups are unavailable on the current Free plan; user approved a manual logical backup gate instead.
- `PUBLIC_SITE_URL` was configured as `https://www.thecollegedate.com`; `SITE_URL` remains optional fallback only.
- The foundation migration initially left broader table privileges than desired; this was corrected with `20260725110000_premium_payment_remediation_grant_hardening.sql`.
- The live `/payment/callback` route returned HTTP 404 before frontend rollout and now returns HTTP 200 with safe missing-reference handling.

## Records Requiring Migration

- Confirmed active Paystack premium: 0
- Confirmed active RevenueCat premium: 0
- Active legacy premium: 0
- Expired premium evidence: 1
- Pending subscription wallet transactions requiring manual review: 13

## Decision

Preflight passed after manual backup approval. Production migration proceeded with non-destructive SQL and post-migration verification gates.
