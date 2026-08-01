# Production Schema Baseline Report

Date: 2026-08-01

## 1. Production Project Verified

Connected production project was verified before schema inspection:

- Project name: `College Date`
- Project reference: `gedoyoleoscgxgdqszzc`
- Organization: `godwillgodslife's` / `lhxcomfjmkhcikbysuli`
- Region: `eu-west-1`
- Status: `ACTIVE_HEALTHY`
- Access used: read-only inspection posture

No remote write, migration apply, SQL DDL, SQL DML, function deployment, settings change, or data export was performed.

## 2. Metadata Sources Inspected

- Supabase project, organization, extension, migration, Edge Function, and advisor tools.
- Read-only PostgreSQL catalog metadata.
- Storage bucket metadata and Storage policy metadata.
- Realtime publication metadata.
- Local repository migrations under `supabase/migrations/`.

## 3. Tables Captured

Captured 47 public tables in `supabase/baseline/010_tables.sql`.

Most important gap addressed: `public.profiles` is now represented as a schema-only baseline table with production columns/defaults/nullability, including onboarding, notification preference, premium, AI trust, referral, and presence fields.

## 4. Views Captured

Captured 6 public views in `supabase/baseline/040_views.sql`:

- `discovery_feed_v3`
- `leaderboard_big_spenders`
- `leaderboard_campus_stars`
- `leaderboard_most_wanted`
- `leaderboard_unified`
- `optimized_confessions`

Security modification: `leaderboard_unified` is created with `security_invoker=true` in the baseline even though production currently reports `security_invoker=false`.

## 5. Functions Captured

Captured function inventory, counts, risk categories, and trigger dependencies in `supabase/baseline/030_functions_and_triggers.sql`.

Function bodies are intentionally not replayed in the baseline because production has:

- 104 public functions.
- 100 `SECURITY DEFINER` functions.
- Multiple advisor-flagged anonymous/signed-in executable privileged functions.
- One mutable `search_path` finding: `public.process_referral_rewards`.

This is a security blocker for claiming the baseline is fully ready to apply.

## 6. Policies And Grants Captured

Captured RLS status and policy/grant posture in the audit. Implemented a staging-safe RLS/grant baseline in `supabase/baseline/050_rls_and_grants.sql`.

The baseline:

- Enables RLS on all 47 public tables.
- Does not reproduce production's `"Public profiles are viewable by everyone"` policy.
- Grants anonymous clients only non-personal catalog/config reads.
- Grants authenticated current-user access for auth/onboarding-adjacent objects.
- Grants profile-derived views to authenticated users only.

## 7. Storage And Realtime Structure Captured

Storage buckets captured in `supabase/baseline/060_storage_and_realtime.sql`:

- `avatars`
- `chat-media`
- `profile-photos`
- `snap_media`
- `snapshot-media`
- `status-media`
- `voice-intros`

Realtime publication membership captured:

- `public.messages`
- `public.notifications`
- `public.profiles`
- `public.wallet_transactions`
- `public.wallets`

## 8. Objects Intentionally Excluded

- Production table rows and application data.
- `auth.users` records.
- Storage objects and media files.
- Vault contents and Supabase secrets.
- Provider credentials.
- Edge Function secrets.
- Production owner-specific grants or ownership statements.
- `supabase_vault` extension contents.
- `pg_net` in `public`.
- Blind replay of production `SECURITY DEFINER` function bodies.
- Production's anonymous profile access policy.

## 9. Known Insecure Production Objects

- `public.profiles` policy `"Public profiles are viewable by everyone"`.
- `public.leaderboard_unified` with `security_invoker=false`.
- Anonymous-callable `SECURITY DEFINER` functions reported by advisors.
- Signed-in callable privileged `SECURITY DEFINER` functions reported by advisors.
- `public.process_referral_rewards` mutable `search_path`.
- `pg_net` installed in exposed `public` schema.
- Broad grants to `anon`/`authenticated` on many public objects.
- Duplicate permissive policies on several tables.

## 10. Security-Safe Staging Modifications

- Do not reproduce anonymous direct profile reads.
- Convert `leaderboard_unified` to `security_invoker=true`.
- Use narrower Storage owner policies.
- Exclude `pg_net` from the public schema baseline.
- Exclude production RPC bodies until reviewed.
- Require staging-only secrets/provider configuration.

## 11. Repository Migration Drift

Production migration history includes migrations through:

- `20260725110000_premium_payment_remediation_grant_hardening`

Local repository also contains migrations not shown in production history:

- `20260725130000_secure_referral_code_flow.sql`
- `20260801120000_restrict_anonymous_profile_access.sql`

The full compatibility matrix is in `docs/native-android/production-schema-baseline-audit.md`.

## 12. Baseline Validation Results

Static validation performed locally:

- SQL files generated in dependency order.
- No production rows intentionally included.
- No `auth.users` export included.
- No Storage object export included.
- No owner statements included.
- No production service-role key included.
- No Edge Function secret values included.
- `git diff --check` passed for generated baseline/docs.
- `psql` is not installed in this environment, so parser-level SQL validation was not available.

CLI `supabase db dump --linked --schema public` was attempted for a full schema dump but timed out waiting on unavailable remote DB credential/link flow. The committed baseline therefore relies on connector metadata and is not a raw `pg_dump` artifact.

## 13. Personal-Data Scan Result

Passed with expected exceptions only.

The generated-file scan found documentation references to `auth.users`, Storage policy references to `storage.objects`, and foreign-key references to `auth.users(id)`. It did not find copied application rows, profile rows, user emails, messages, wallet records, payment records, referrals, media objects, or push tokens.

## 14. Secret Scan Result

Passed with expected documentation warnings only.

The generated-file scan found only warning text containing `service-role` and did not find JWT-looking keys, Supabase key variables, provider secrets, database URLs, production API URLs, passwords, or secret assignments.

## 15. Commit Hash

`3720081` (`database: add schema-only staging baseline`)

## 16. Ready To Apply To Staging?

Not yet.

The table, constraint, index, view, RLS, storage, and Realtime baseline is ready for human review, but the package is not ready to apply end-to-end until privileged function bodies and broader policy grants are reviewed and either safely replayed from repository migrations or intentionally redesigned.

## 17. Exact Remaining Blockers

1. Export or reconstruct reviewed function bodies without copying production-only constants or unsafe grants.
2. Decide which `SECURITY DEFINER` RPCs are needed for staging Phase 1.5 and which should be deferred.
3. Fix or intentionally exclude `public.process_referral_rewards` mutable `search_path`.
4. Decide whether `pg_net` is needed in staging and, if so, install it outside `public`.
5. Rehearse `20260801120000_restrict_anonymous_profile_access.sql` on staging.
6. Configure staging Auth, providers, Edge Function secrets, Storage, and synthetic users separately.
7. Run Supabase security/performance advisors against staging after baseline application.
