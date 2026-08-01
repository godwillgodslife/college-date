# Staging Schema Bootstrap Plan

Date: 2026-08-01

Target staging project:

| Field | Value |
| --- | --- |
| Project name | College Date Staging |
| Project reference | pxobauvatbjncluuunyq |
| Intended source | Production schema metadata from `gedoyoleoscgxgdqszzc` |
| Data policy | Schema-only; no production user/application data |

## Execution Order

1. Confirm the connected project is staging `pxobauvatbjncluuunyq`, not production `gedoyoleoscgxgdqszzc`.
2. Apply reviewed schema baseline files in order:
   - `supabase/baseline/000_extensions_and_types.sql`
   - `supabase/baseline/010_tables.sql`
   - `supabase/baseline/020_constraints_and_indexes.sql`
   - `supabase/baseline/030_functions_and_triggers.sql`
   - `supabase/baseline/035_required_functions_hardened.sql`
   - `supabase/baseline/040_views.sql`
   - `supabase/baseline/050_rls_and_grants.sql`
   - `supabase/baseline/060_storage_and_realtime.sql`
   - `supabase/baseline/070_staging_seed_structure.sql`
3. Apply repository migrations classified as required afterward:
   - `20260725130000_secure_referral_code_flow.sql` is superseded for initial staging bootstrap by the reviewed referral RPCs in `035_required_functions_hardened.sql`; do not apply both without a diff review.
   - Any reviewed function/RPC migrations needed for the specific staging test surface.
4. Apply `20260801120000_restrict_anonymous_profile_access.sql` as the first-stage RLS remediation rehearsal.
5. Create synthetic test users in staging only.
6. Create synthetic profiles tied to those staging `auth.users` rows.
7. Run the security matrix for anonymous/authenticated/profile access.
8. Run functional smoke tests for auth, onboarding routing, profile hydration, and logout.
9. Rehearse rollback or reset.

## Required Staging Extensions

Required:

- `pgcrypto` in `extensions`
- `uuid-ossp` in `extensions`

Excluded from baseline:

- `supabase_vault`: secrets and vault contents must be configured separately.
- `pg_net`: production has it in `public`, which is advisor-flagged. Reintroduce only after deciding a non-exposed schema location.
- `pg_stat_statements`: platform telemetry, not app schema.

## Environment-Specific Placeholders

Configure separately in staging:

- Supabase URL and anon/publishable key.
- Auth redirect URLs and native deep links.
- Google/Facebook OAuth credentials.
- OneSignal/Firebase credentials.
- RevenueCat webhook auth.
- Paystack keys and webhook secrets.
- OpenRouter keys and AI model settings.
- Edge Function environment variables.

Do not copy production secrets, service-role keys, payment provider secrets, webhook secrets, auth provider client secrets, vault records, or signing credentials.

## Storage Setup Requirements

Create the buckets listed in `060_storage_and_realtime.sql`:

- `avatars`
- `chat-media`
- `profile-photos`
- `snap_media`
- `snapshot-media`
- `status-media`
- `voice-intros`

Use synthetic media only. Do not copy production Storage objects.

Review storage policies before applying. The baseline uses authenticated-owner folder policies rather than production's duplicate legacy public-role upload policies.

## Realtime Setup Requirements

Production Realtime publication membership:

- `public.messages`
- `public.notifications`
- `public.profiles`
- `public.wallet_transactions`
- `public.wallets`

The baseline uses `alter publication supabase_realtime add table ...` statements. Run only on staging and only if those tables are not already publication members.

## Auth Configuration

Auth is not represented by SQL alone. Configure in staging dashboard or approved management tooling:

- Email/password settings.
- Email verification behavior.
- Password reset redirect URLs.
- OAuth providers.
- Site URL.
- Additional redirect URLs, including native Android callback URLs.
- Leaked-password protection should be enabled before production parity testing.

Do not export or import `auth.users` rows from production.

## External Provider Configuration

External integrations must be isolated for staging:

- Paystack: staging/test credentials only.
- RevenueCat: staging app/project or sandbox configuration only.
- OneSignal/Firebase: staging app identifiers where possible.
- OpenRouter: staging secret or capped test key only.
- Email provider: staging-safe templates and sender policy.

## Synthetic Test-Data Plan

Create only synthetic data:

- Two or more adult synthetic auth users.
- Synthetic profiles with non-real names, campuses, and images.
- Synthetic wallet balances only if wallet RPCs are explicitly in test scope.
- Synthetic messages/matches only after messaging feature testing is approved.

Never copy production profiles, photos, messages, matches, payment records, referrals, push tokens, reports, or moderation records.

## Verification Queries

Run these only on staging after applying reviewed SQL:

```sql
select count(*) from public.profiles;
select relname, relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by relname;
select schemaname, tablename, policyname
from pg_policies
where schemaname = 'public' and tablename = 'profiles'
order by policyname;
select table_name, grantee, privilege_type
from information_schema.table_privileges
where table_schema = 'public'
  and table_name in ('profiles', 'discovery_feed_v3', 'leaderboard_unified')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by schemaname, tablename;
```

Expected security outcomes:

- Anonymous role has no direct `profiles` table access.
- `profiles` has no `"Public profiles are viewable by everyone"` policy.
- `leaderboard_unified` is `security_invoker=true`.
- Authenticated synthetic users can read/update only their own profile unless a separately reviewed discovery policy/RPC is introduced.

## Rollback Or Staging Reset

Preferred rollback for staging:

1. Drop and recreate the staging project, or reset the staging development branch if using Supabase branching.
2. Reapply the reviewed baseline files.
3. Reapply only migrations classified as required.

If dropping objects manually, do it only on staging and only after confirming project ref `pxobauvatbjncluuunyq`.

## Known Schema Drift

- Production base table creation history is incomplete in repository migrations.
- `public.profiles` canonical creation was missing locally before this baseline.
- Production `leaderboard_unified` is advisor-flagged as security-definer; baseline corrects it.
- Production grants and policies are broad and duplicated in several areas; baseline narrows them.
- Production function bodies are not dumped into this baseline because the privileged RPC surface needs security review.

## Deferred Insecure Objects

Deferred until reviewed:

- `public.rls_auto_enable()` if present in legacy local scripts; not seen in the production function inventory.
- Anonymous-callable `SECURITY DEFINER` RPCs.
- Authenticated-callable privileged payment/wallet/admin RPCs.
- `public.process_referral_rewards` mutable `search_path`.
- `pg_net` in `public`.
- Production broad Storage policies assigned to `{public}`.
- Production public profile policy.

## RLS Remediation Sequence

The committed remediation `20260801120000_restrict_anonymous_profile_access.sql` should be rehearsed after the baseline because it is the production-intended first-stage fix for anonymous profile access. The baseline already reflects its security direction, but staging should still run the migration to prove idempotence, rollback, and app compatibility.
