# Production Migration Results

Date: 2026-07-25

Status: Passed

## Migration

Applied production migrations:

```text
supabase/migrations/20260721120000_premium_payment_remediation_foundation.sql
supabase/migrations/20260725110000_premium_payment_remediation_grant_hardening.sql
```

## Review Result

The foundation migration used production-safe patterns for the new remediation objects:

- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `CREATE OR REPLACE FUNCTION`
- `DROP POLICY IF EXISTS` before replacement policies
- Non-destructive grants/revokes
- No `TRUNCATE`
- No production table drops
- No deletes from payment, wallet, or premium tables

Compatibility checks passed for referenced existing objects:

- `public.profiles(id, is_premium, premium_expires_at, last_active)`
- `public.subscriptions(user_id, plan_type, status, current_period_end, updated_at)`
- `public.wallets(user_id, available_balance, pending_balance, total_earned, total_spent, updated_at)`
- `public.wallet_transactions(user_id, wallet_id, type, amount, status, description, payment_method, reference_id, metadata)`
- `public.withdrawals`
- `public.profile_views`
- `public.swipes`

Important compatibility notes:

- `subscriptions.user_id` has a unique constraint, so `ON CONFLICT (user_id)` is compatible.
- `wallets.user_id` has a unique constraint, so wallet upsert assumptions are compatible.
- `wallet_transactions.reference_id` has a unique constraint, supporting duplicate-reference protection for old transaction rows.

## Apply Result

`npx supabase db push --linked` applied the foundation migration successfully.

A follow-up hardening migration was added and applied after post-migration inspection showed broader client privileges than necessary on the new tables.

## Created Objects

Tables created and verified:

- `paid_products`
- `payment_attempts`
- `provider_webhook_events`
- `entitlements`
- `wallet_ledger`
- `payment_audit_logs`
- `monetization_config`

RPCs created and verified:

- `get_admirers_secure(p_limit integer)`
- `get_monetization_config()`
- `get_my_entitlements()`
- `get_profile_viewers_secure(p_limit integer)`
- `grant_paid_product_entitlements(...)`
- `has_entitlement(p_user_id uuid, p_entitlement_key text)`
- `process_verified_payment(...)`
- `purchase_premium_with_wallet(p_product_id text)`
- `request_wallet_withdrawal(p_amount numeric, p_bank_details jsonb)`

## Product Catalogue

Server-owned active products:

- `premium_monthly`: NGN 2,900
- `wallet_topup_2000`: NGN 2,000
- `wallet_topup_5000`: NGN 5,000
- `wallet_topup_10000`: NGN 10,000
- `wallet_topup_20000`: NGN 20,000

## Privilege Hardening

The hardening migration revokes direct client writes on the new payment tables and grants only the expected read/execute surface:

- `anon` and `authenticated`: read active products and monetization config.
- `authenticated`: read only own data through RLS on attempts, entitlements, wallet ledger, and wallet transactions.
- `service_role`: process verified payments and grants.
- `authenticated`: use wallet withdrawal, wallet premium purchase, viewer/admirer secure RPCs, and entitlement reads.

Verified forbidden privileges:

- Authenticated users cannot insert entitlements.
- Authenticated users cannot insert payment attempts directly.
- Authenticated users cannot insert wallet ledger rows.
- Authenticated users cannot read webhook events.
- Authenticated users cannot read audit logs.
- Authenticated users cannot update product pricing.

## Post-Migration Row Counts

- `paid_products`: 5
- `payment_attempts`: 0
- `provider_webhook_events`: 0
- `entitlements`: 0
- `wallet_ledger`: 0
- `payment_audit_logs`: 0

## Verification Evidence

Post-deploy verification query:

```text
docs/premium-payment-remediation/evidence/20260725-production-postdeploy-verification.sql
```
