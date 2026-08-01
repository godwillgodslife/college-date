# Native Phase 1.5 RLS Verification Report

Date: 2026-08-01

## Scope

This report covers only the data required by the Phase 1/1.5 native Android auth foundation:

- Supabase Auth.
- Current-user profile lookup.
- Onboarding-completion state via `profiles.is_onboarded`.

No production schema changes, migrations, destructive commands, or data writes were performed.

## Native Data Access

The native app currently reads only:

```text
profiles.id
profiles.name
profiles.username
profiles.avatar_url
profiles.is_onboarded
```

The read path is `SupabaseProfileRemoteDataSource.fetchCurrentUserProfile(profileId)`, which filters by the authenticated user's id. The native app does not use service-role access and does not perform broad profile queries.

## Live Checks Performed

Public client configuration:

- Supabase project URL: configured locally from ignored config.
- Supabase anon/publishable key: configured locally from ignored config.
- Service-role key: not used.

Anonymous public-client REST probes:

| Probe | Method | Result |
|---|---|---|
| Anonymous `profiles?select=id&limit=1` | GET via anon key | HTTP 206, returned 1 row |
| Anonymous `profiles?select=id,is_onboarded&limit=1` | GET via anon key | HTTP 206, returned 1 row |

No profile values were printed or stored in this report.

## Findings

### RLS-1: Anonymous clients can read at least minimal `profiles` data

Severity: High for native migration readiness.

The anonymous REST probes returned a row for `profiles.id` and `profiles.is_onboarded`. That means a public unauthenticated client can read at least some profile rows/columns through the REST API.

This may be an intentional public-discovery policy in the existing web app, but it is not acceptable to assume it is safe for the native app without a policy review because `profiles` also carries private account, onboarding, presence, monetization, referral, and notification-related fields.

Native Phase 1.5 does not issue broad profile reads, but Phase 2 must not expand profile/discovery access until the policy is narrowed or documented as intentionally public only for a safe public view.

Recommended mitigation:

- Prefer a dedicated public discovery view/RPC that exposes only safe public profile fields.
- Keep private profile fields readable only to the owning user or reviewed admin/server paths.
- Ensure `profiles.is_onboarded` is not readable by anonymous clients unless there is a documented product reason.

## Checks Not Completed

The following could not be verified directly:

- Whether RLS is enabled on `profiles` right now.
- Exact `profiles` policy definitions.
- Authenticated test user can read only their permitted profile row.
- Authenticated test user cannot read another user's private profile fields.
- Authenticated test user cannot modify another user's profile.

Reasons:

- Supabase plugin installation succeeded, but the connector was not connected to a Supabase account.
- No approved test-account credentials were available.
- No writes were attempted against production data.

## Repository Evidence

Repository evidence from prior documentation says production `profiles` had RLS enabled with 8 policies in a July 2026 read-only snapshot, but that report was itself marked blocked for full RLS verification.

Relevant evidence:

- `docs/premium-payment-remediation/20-rls-verification.md`
- `docs/native-android/current-system-audit.md`

This is useful background, not a substitute for live policy verification.

## Owner SQL Checks

Run these read-only checks in Supabase SQL editor or via a connected Supabase tool. Do not paste service-role keys into the Android project.

```sql
select
  c.relname,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'profiles';

select
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'profiles'
order by policyname;
```

Then verify behavior with three non-admin users:

```text
1. Anonymous public client:
   - Should not read private profile records or private fields.
   - Should not read `profiles.is_onboarded` unless intentionally public.

2. Authenticated user A:
   - Can read own minimal profile state needed for onboarding.
   - Cannot update another user's profile.
   - Cannot read another user's private fields.

3. Authenticated user B:
   - Same checks in reverse against user A.
```

## Required Policy Decision Before Phase 2

Choose one:

1. Keep `profiles` private and create safe views/RPCs for discovery.
2. Split public profile fields from private profile fields.
3. Explicitly document which `profiles` columns are public and enforce column-safe access through views/RPCs.

Until this is resolved, Phase 2 profile/discovery implementation is blocked.
