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

## Second-Phase Authenticated Isolation

Created and applied on staging:

- `supabase/migrations/20260801163000_restrict_authenticated_profile_access.sql`
- SHA-256: `D2793AE8BF87107EEF98A7E5239956806DD703EAE38B22BCEFFAB08818D34EBC`

Created and rehearsed rollback:

- `docs/native-android/authenticated-profile-isolation-rollback.sql`
- SHA-256: `DFF9D1F6B2EABB6388123588A17D3C30573B4DAEBC4A6BCF5BA0149FCB46A096`

The second-phase migration:

- removes the transitional authenticated `profiles SELECT USING (true)` policy;
- consolidates `profiles` down to four owner-only policies;
- removes direct authenticated grants on raw profile-derived views;
- adds `get_matched_profile(uuid)` as a safe matched-profile contract;
- restricts direct authenticated profile writes to permitted columns only.

Rollback was rehearsed and reapplication succeeded. Staging ended in the hardened second-phase state.

## Final Staging Security State

| Check | Result |
| --- | --- |
| `Public profiles are viewable by everyone` | Absent |
| `anon` can select `profiles` | No |
| `anon` can select `discovery_feed_v3` | No |
| `anon` can select `leaderboard_unified` | No |
| `anon` can select `optimized_confessions` | No |
| `leaderboard_unified` | `security_invoker=true` |
| Owner policies | Present; four consolidated policies |
| Transitional authenticated broad profile read | Absent |
| Direct authenticated raw view grants | Absent |
| Safe matched-profile RPC | Present |

## Security Verdict

The first-stage migration addresses anonymous profile/view exposure in staging. The second-stage migration addresses the broad authenticated direct profile-read blocker at metadata/policy level.

Live owner/non-owner runtime proof is still blocked until disposable confirmed staging Auth users are available.

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
- Authenticated profile isolation migration apply.
- Authenticated profile isolation rollback rehearsal.
- Authenticated profile isolation reapply.
- Anonymous REST denial after final reapply.
- Referral validation remains anonymous-callable.

Blocked:

- Disposable staging Auth user creation.
- REST/Auth registration, login, and password reset.
- Owner live RLS tests.
- Non-owner live RLS tests.
- Functional RPC tests with real authenticated sessions.

Blocker evidence:

- SQL writes to `auth.users` were rejected by Supabase tooling/platform restrictions.
- DNS is now reachable over IPv4, but public signup is blocked by email-domain validation and `over_email_send_rate_limit`.
- No connected Auth admin user-creation tool is available.

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
- owner/non-owner profile tests;
- discovery, referral, swipe, leaderboard, and confession smoke tests with synthetic sessions;
- product-owner approval and rollback/monitoring assignment.

Native Android Phase 2 remains blocked.
