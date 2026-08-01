# Profile RLS Remediation Report

Date: 2026-08-01

Scope: remediate anonymous public-client access to `public.profiles` and profile-derived views for The College Date. Production root cause was established in prior read-only inspection; this update records the completed staging-only bootstrap, remediation apply, rollback rehearsal, and remaining blockers.

Production project `gedoyoleoscgxgdqszzc` was not accessed or modified during the staging apply pass.

## Root Cause

The anonymous exposure was caused by the production access model captured in the earlier read-only inspection:

- `public.profiles` had RLS enabled.
- A policy named `Public profiles are viewable by everyone` applied to `public` with `USING (true)`.
- `anon` had broad table privileges on `public.profiles`.
- Profile-derived views such as `discovery_feed_v3`, `leaderboard_unified`, and `optimized_confessions` were anonymously readable.
- `leaderboard_unified` did not use `security_invoker=true` in the vulnerable state.

No repository evidence showed a legitimate logged-out product requirement for anonymous users to read dating profiles, discovery cards, leaderboards, or confession feed internals.

## Migration Package

Remediation migration:

- `supabase/migrations/20260801120000_restrict_anonymous_profile_access.sql`
- SHA-256: `BB482DE77DC813162333981A3DA69FC46AAA10BE776391ED4AB0B1849CBEAAD7`

Rollback SQL:

- `docs/native-android/profile-rls-emergency-rollback.sql`
- SHA-256: `46DE6935E6288A52153A7D9A267E848C2FD193F0B02BC60A3A59AA2738433CE9`

The remediation:

- revokes `anon`/`PUBLIC` direct access to `public.profiles`;
- drops the broad public profile policy;
- keeps authenticated profile access through a transitional compatibility policy;
- recreates owner insert/select/update/delete policies;
- revokes anonymous access from the profile-derived app views;
- grants authenticated `SELECT` on those views;
- sets `leaderboard_unified` to `security_invoker=true`;
- reloads the PostgREST schema cache.

It does not insert, update, delete, truncate, or copy user data. It does not modify payment, wallet, Premium, notification, storage, Auth provider, or Edge Function settings.

## Staging Result

Staging project:

- Name: `College Date Staging`
- Ref: `pxobauvatbjncluuunyq`
- Organization: `hekkdwsfxzaplyipyoes`
- Region: `eu-west-1`

Result:

- Schema-only baseline applied.
- Hardened RPC subset applied.
- Remediation applied.
- Emergency rollback rehearsed.
- Remediation reapplied.
- Staging ended in the remediated state.
- Public app tables still contain zero rows.
- No production user/application data was copied.

Detailed evidence is in [staging-bootstrap-and-security-results.md](C:/college-date/docs/native-android/staging-bootstrap-and-security-results.md).

## Final Staging Security State

| Check | Result |
| --- | --- |
| `Public profiles are viewable by everyone` | Absent |
| `anon` can select `profiles` | No |
| `anon` can select `discovery_feed_v3` | No |
| `anon` can select `leaderboard_unified` | No |
| `anon` can select `optimized_confessions` | No |
| `leaderboard_unified` | `security_invoker=true` |
| Owner policies | Present |
| Transitional authenticated broad profile read | Present |

## Security Verdict

The first-stage migration addresses the anonymous profile/view exposure in staging.

It does not fully solve authenticated non-owner privacy. The transitional policy `Authenticated users can read profiles for current app screens` uses `USING (true)`, so signed-in users may still directly read non-owner profile rows/columns until the application moves to safe profile/discovery/matched-profile contracts and the broad policy is removed.

`discovery_feed_v3` also remains too broad for native Android discovery. Native discovery should use `get_discovery_profiles(...)`, whose live staging return contract was verified to omit email, phone, push identifiers, wallet data, referral fields, notification settings, moderation flags, AI-review fields, and admin flags.

## Test Results

Passed:

- Staging project identity verification.
- Baseline object creation.
- RLS enabled on all public base tables.
- Anonymous metadata denial on `profiles` and target views.
- `leaderboard_unified security_invoker=true`.
- Hardened RPC metadata/grant review.
- Rollback rehearsal.
- Remediation reapply.
- Public table row count remains zero.

Blocked:

- Disposable staging Auth user creation.
- REST/Auth registration, login, and password reset.
- Owner live RLS tests.
- Non-owner live RLS tests.
- Functional RPC tests with real authenticated sessions.

Blocker evidence:

- SQL writes to `auth.users` were rejected by Supabase tooling/platform restrictions.
- Local DNS resolution fails for `pxobauvatbjncluuunyq.supabase.co`, so REST Auth/API calls cannot reach staging from this workstation.

## Advisor Findings

Staging security advisors still report:

- RLS-enabled no-policy INFO findings on deferred later-phase tables.
- Intentionally anonymous-callable `validate_referral_code(text)`.
- Authenticated app-facing `SECURITY DEFINER` RPC warnings.

Staging performance advisors still report:

- six unindexed foreign keys;
- unused indexes due no staging traffic;
- duplicate permissive policies on `profiles`.

## Production Recommendation

Do not apply the remediation to production yet.

Production promotion should wait for:

- live disposable-user RLS/RPC tests in staging;
- removal or formal acceptance of the broad authenticated profile policy;
- duplicate policy consolidation;
- owner/non-owner profile tests;
- discovery, referral, swipe, leaderboard, and confession smoke tests with synthetic sessions;
- product-owner approval and rollback/monitoring assignment.

Native Android Phase 2 remains blocked.
