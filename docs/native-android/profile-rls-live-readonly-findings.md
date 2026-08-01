# Profile RLS Live Read-Only Findings

Date: 2026-08-01

Project: `College Date`, ref `gedoyoleoscgxgdqszzc`

Scope: read-only Supabase MCP inspection of PostgreSQL catalogue metadata, grants, policies, views, storage policies, function metadata, and advisors. No user records were selected. No SQL writes were executed. No migrations were applied.

## Confirmed Root Cause

`public.profiles` has RLS enabled, but production contains a broad policy:

- Policy: `Public profiles are viewable by everyone`
- Command: `SELECT`
- Roles: `public`
- Expression: `true`

Production grants also give `anon` `SELECT` on `public.profiles`. The policy plus grant explains anonymous profile reads through the public client.

## Profile Policies Found

- `Admins can view all profiles`: authenticated `SELECT`, gated by `is_app_admin()`.
- `Public profiles are viewable by everyone`: public `SELECT`, `true`.
- `Users can delete own profile`: public `DELETE`, `auth.uid() = id`.
- `Users can insert own profile during onboarding`: authenticated `INSERT`, `id = auth.uid()`.
- `Users can insert their own profile`: public `INSERT`, `auth.uid() = id`.
- `Users can read own profile during onboarding`: authenticated `SELECT`, `id = auth.uid()`.
- `Users can update own profile during onboarding`: authenticated `UPDATE`, `id = auth.uid()`.
- `Users can update their own profile`: public `UPDATE`, `auth.uid() = id`.

## Profile-Derived Views With Anonymous SELECT

The following production views have `anon SELECT` grants:

- `discovery_feed_v3`
- `leaderboard_unified`
- `optimized_confessions`
- `leaderboard_big_spenders`
- `leaderboard_campus_stars`
- `leaderboard_most_wanted`

`leaderboard_unified` currently has `security_invoker=false`; the other checked profile-derived views had `security_invoker=true`.

## Sensitive View Columns Observed

`discovery_feed_v3` exposes many `profiles` columns including account, notification, referral, quota, presence, and internal status fields. This should be replaced with a narrowed authenticated discovery RPC or view before native discovery work begins.

`optimized_confessions` exposes `user_id` and `claimer_ids`. That remains a separate confession anonymity blocker.

`leaderboard_big_spenders` exposes `total_spent`. Product/security should approve whether exact spending values are appropriate or whether a tier/badge should replace it.

## Anonymous-Callable SECURITY DEFINER RPCs

Read-only function metadata found these `SECURITY DEFINER` functions executable by `anon` or `PUBLIC`:

- `get_admirers_secure(p_limit integer)`
- `get_monetization_config()`
- `get_my_entitlements()`
- `get_profile_viewers_secure(p_limit integer)`
- `has_entitlement(p_user_id uuid, p_entitlement_key text)`
- `insert_notification(...)` long overload
- `purchase_premium_with_wallet(p_product_id text)`
- `register_notification_device(...)`
- `request_wallet_withdrawal(p_amount numeric, p_bank_details jsonb)`
- `revoke_notification_device(...)`

Several reference `auth.uid()`, but execute grants should still be reviewed in a separate hardening pass. This profile RLS migration does not change payment, wallet, notification, or entitlement functions.

## Storage Policy Notes

Storage object policies contain several `roles = public` upload/update/delete policies guarded by `auth.role() = 'authenticated'` or owner folder predicates. The Supabase skill notes `auth.role()` checks are deprecated for RLS policy design; storage policies should be reviewed separately. This profile migration does not modify storage.

## Advisor Notes

Security advisor returned:

- `leaderboard_unified` security-definer view risk.
- RLS-enabled tables with no policies: `payment_audit_logs`, `provider_webhook_events`.
- `pg_net` installed in `public`.
- Multiple anonymous-callable and authenticated-callable `SECURITY DEFINER` functions.
- Leaked password protection disabled.

Performance advisor returned:

- Several unindexed foreign keys.
- Multiple RLS init-plan warnings.
- Multiple permissive policy warnings.

Those findings are outside the anonymous profile access patch and should be handled in follow-up security/performance hardening phases.
