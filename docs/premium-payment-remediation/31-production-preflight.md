# Production Preflight

Date: 2026-07-21

Status: Blocked

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

Remote migrations present through:

- `20260716163000`

Local migration pending:

- `20260721120000_premium_payment_remediation_foundation.sql`

## Existing Tables

Existing payment/premium adjacent public tables:

- `boosts`
- `profiles`
- `subscriptions`
- `transactions`
- `wallet_transactions`
- `wallets`

New remediation tables not present before rollout:

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

RLS is enabled on existing public `profiles`, `subscriptions`, `wallet_transactions`, and `wallets`.

Existing wallet transaction policies still allow own-row insert/update by policy, but the pending remediation migration revokes direct insert/update/delete privileges from `anon` and `authenticated` on `wallet_transactions`.

## Production Counts

- Profiles: 478
- `profiles.is_premium = true`: 0
- Active profile premium by expiration: 0
- Profiles with any `premium_expires_at`: 1
- Subscriptions: 414
- Premium subscriptions: 1
- Active premium subscriptions: 0
- Expired active-status premium subscriptions: 1
- Paystack subscription evidence fields populated: 0
- Wallets: 455
- Wallets with balance or activity: 412
- Total available wallet balance: NGN 18,600.00
- Total pending wallet balance: NGN 1,500.00
- Wallet transactions: 170
- Completed wallet transactions: 128
- Completed Paystack wallet transactions: 128
- Completed RevenueCat wallet transactions: 0
- Completed subscription wallet transactions: 0
- Pending subscription wallet transactions: 13
- Completed deposit wallet transactions: 1
- Pending deposit wallet transactions: 27
- Duplicate non-null wallet transaction reference groups: 0
- `transactions` rows: 0

## Potential Conflicts

- Backup gate failed: CLI shows no listed physical backups and PITR disabled.
- Required new Paystack secret name `PAYSTACK_SECRET_KEY` is not configured in Supabase secrets.
- Optional callback secret names `PUBLIC_SITE_URL` and `SITE_URL` are not configured; the function can fall back to origin/live default, but production should pin this.
- `initialize-paystack-payment` and `paystack-webhook` are not currently deployed.
- The current live `/payment/callback` route returned HTTP 404 before the frontend rollout, so the frontend must not be deployed until the database and functions are available.

## Decision

Production writes were not performed because the recoverable backup requirement was not met.
