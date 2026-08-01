# Staging Schema Bootstrap Plan

Date: 2026-08-01

Target staging project:

| Field | Value |
| --- | --- |
| Project name | `College Date Staging` |
| Project reference | `pxobauvatbjncluuunyq` |
| Organization | `hekkdwsfxzaplyipyoes` |
| Region | `eu-west-1` |
| Intended source | Schema-only production metadata from `gedoyoleoscgxgdqszzc` |
| Data policy | No production user/application data |

Production project `gedoyoleoscgxgdqszzc` must not be accessed or modified by this staging bootstrap task.

## Required Execution Order

1. `supabase/baseline/000_extensions_and_types.sql`
2. `supabase/baseline/010_tables.sql`
3. `supabase/baseline/020_constraints_and_indexes.sql`
4. `supabase/baseline/030_functions_and_triggers.sql`
5. `supabase/baseline/035_required_functions_hardened.sql`
6. `supabase/baseline/040_views.sql`
7. `supabase/baseline/050_rls_and_grants.sql`
8. `supabase/baseline/060_storage_and_realtime.sql`
9. `supabase/baseline/070_staging_seed_structure.sql`
10. `supabase/migrations/20260801120000_restrict_anonymous_profile_access.sql`
11. Rollback rehearsal with `docs/native-android/profile-rls-emergency-rollback.sql`
12. Reapply `supabase/migrations/20260801120000_restrict_anonymous_profile_access.sql`

## Actual Execution Note

The order above was followed, with one connector-driven split:

- `035_required_functions_hardened.sql` was applied as reviewed sub-migrations after the connector rejected the original `calculate_completion_score()` body with `INVALID_ARGUMENT`.
- The rejected calls did not partially execute.
- The local file now contains the patched `calculate_completion_score()` body and has SHA-256 `528C4B85DD6B7482B02F235840BDC674B604397192C73E185B9DB561C4D85917`.

Production should use a single committed reviewed migration, or an intentionally split committed sequence, rather than ad hoc connector chunks.

## Required Staging Extensions

Required:

- `pgcrypto` in `extensions`
- `uuid-ossp` in `extensions`

Staging bootstrap cleanup:

- The connected staging project had a pre-existing `public.rls_auto_enable()` `SECURITY DEFINER` helper before College Date schema bootstrap.
- Supabase advisors reported it as executable by `anon` and `authenticated`.
- `000_extensions_and_types.sql` conditionally revokes client/PUBLIC `EXECUTE` on that helper when present. It does not drop or alter the helper body.

Excluded from baseline:

- `supabase_vault`
- `pg_net`
- `pg_stat_statements`

## Environment Configuration Still Required

Configure separately in staging:

- Supabase URL and publishable/anon key for web/native clients.
- Auth redirect URLs and native deep links.
- Email/password settings and email verification behavior.
- Google/Facebook OAuth credentials.
- OneSignal/Firebase credentials, if push is tested later.
- RevenueCat, Paystack, and webhook secrets, if payment testing is separately approved.
- OpenRouter keys and AI model settings, if AI testing is separately approved.
- Edge Function environment variables.

Do not copy production secrets, service-role keys, payment provider secrets, webhook secrets, auth provider client secrets, vault records, signing credentials, or production user data.

## Storage Setup

The baseline created these staging buckets:

- `avatars`
- `chat-media`
- `profile-photos`
- `snap_media`
- `snapshot-media`
- `status-media`
- `voice-intros`

Storage object count after bootstrap: `0`.

Use synthetic media only.

## Realtime Setup

The baseline added these tables to `supabase_realtime`:

- `public.messages`
- `public.notifications`
- `public.profiles`
- `public.wallet_transactions`
- `public.wallets`

Realtime payload safety still needs review before native Phase 2 because direct `profiles` row updates may expose more columns than native clients should consume.

## Synthetic Test-Data Plan

Still required:

- incomplete-profile owner;
- completed-profile owner;
- authenticated non-owner;
- discovery candidate;
- blocked/reported pair;
- referral owner and referred user;
- confession author;
- leaderboard participant.

Do not record test passwords in Git, logs, docs, or screenshots.

Current blocker: local DNS cannot resolve `pxobauvatbjncluuunyq.supabase.co`, so REST Auth signup/login/password-reset cannot run from this workstation. SQL writes to `auth.users` were also rejected by the connected tooling/platform.

## Verification Queries

Use metadata-only checks where possible:

```sql
select has_table_privilege('anon', 'public.profiles', 'SELECT');
select has_table_privilege('anon', 'public.discovery_feed_v3', 'SELECT');
select has_table_privilege('anon', 'public.leaderboard_unified', 'SELECT');
select has_table_privilege('anon', 'public.optimized_confessions', 'SELECT');
select reloptions
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'leaderboard_unified';
```

Then run REST/RPC tests with disposable users once Auth/API connectivity is available.

## Expected Final Security Outcomes

- Anonymous role has no direct `profiles` table access.
- `profiles` has no `Public profiles are viewable by everyone` policy.
- Profile-derived app views are not anonymously readable.
- `leaderboard_unified` is `security_invoker=true`.
- Native discovery uses `get_discovery_profiles(...)`.
- Direct authenticated non-owner `profiles` reads remain a known transitional risk until a follow-up migration removes the broad compatibility policy.

## Rollback

Emergency rollback:

- `docs/native-android/profile-rls-emergency-rollback.sql`
- SHA-256: `46DE6935E6288A52153A7D9A267E848C2FD193F0B02BC60A3A59AA2738433CE9`

Staging rehearsal passed on 2026-08-01:

1. Rollback restored the old public profile/view access contract.
2. Remediation reapply removed anonymous access again.
3. Staging finished in the remediated state.

Use rollback only for a specific compatibility incident because it deliberately reopens anonymous profile/view access.

## Deferred Insecure Or Incomplete Areas

- Broad transitional authenticated `profiles` `SELECT USING (true)`.
- Duplicate permissive `profiles` policies.
- Later-phase tables with RLS enabled and no policies.
- Payment, wallet, Premium, call, push, messaging, and admin RPC/policy hardening.
- Authenticated app-facing `SECURITY DEFINER` RPC live session testing.
- Staging DNS/Auth setup for disposable user tests.

## Current Verdict

The staging schema is bootstrapped and remediated, but production promotion and native Android Phase 2 are not approved yet.
