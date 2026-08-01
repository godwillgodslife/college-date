# Profile RLS Staging Results

Date: 2026-08-01

Project used: `College Date Staging` / `pxobauvatbjncluuunyq` in organization `hekkdwsfxzaplyipyoes`, region `eu-west-1`.

Production project `gedoyoleoscgxgdqszzc` was not accessed or modified.

## Summary

The staging schema bootstrap is now applied, the first-stage anonymous-profile remediation is applied, rollback was rehearsed on staging, and remediation was reapplied. Staging finished in the remediated state.

The pass is not a full production approval because disposable staging Auth users could not be created and live authenticated owner/non-owner tests could not run from this workstation.

## Final Security State

| Check | Result |
| --- | --- |
| Broad `Public profiles are viewable by everyone` policy | Absent |
| `anon` can select `public.profiles` | No |
| `anon` can select `public.discovery_feed_v3` | No |
| `anon` can select `public.leaderboard_unified` | No |
| `anon` can select `public.optimized_confessions` | No |
| `leaderboard_unified` | `security_invoker=true` |
| Public app table rows | 0 |
| Storage objects | 0 |

## Applied Migration History

| Order | Migration name | Result |
| ---: | --- | --- |
| 1 | `baseline_000_extensions_and_types` | Applied |
| 2 | `baseline_010_tables` | Applied |
| 3 | `baseline_020_constraints_and_indexes` | Applied |
| 4 | `baseline_030_functions_and_triggers_inventory` | Applied |
| 5 | `baseline_035a_referral_profile_bootstrap` | Applied |
| 6 | `p035b1_completion_score` | Applied |
| 7 | `p035b2_profile_read` | Applied |
| 8 | `p035b3_profile_update_presence` | Applied |
| 9 | `p035c_discovery_quota` | Applied |
| 10 | `p035d_feed_swipe` | Applied |
| 11 | `p035e_match_leaderboard_confessions` | Applied |
| 12 | `p035f_triggers_grants` | Applied |
| 13 | `baseline_040_views` | Applied |
| 14 | `baseline_050_rls_and_grants` | Applied |
| 15 | `baseline_060_storage_and_realtime` | Applied |
| 16 | `baseline_070_staging_seed_structure` | Applied |
| 17 | `restrict_anonymous_profile_access_20260801120000` | Applied |
| 18 | `staging_profile_rls_rollback_rehearsal` | Applied |
| 19 | `staging_profile_rls_reapply_remediation` | Applied |

## Object Counts

| Object | Count |
| --- | ---: |
| Public base tables | 47 |
| Public views | 6 |
| Public functions | 22 |
| Public policies | 24 |
| Public base tables without RLS | 0 |
| Storage buckets | 7 |
| Storage objects | 0 |
| Realtime publication tables | 5 |

## Hash Verification

- Remediation hash passed: `BB482DE77DC813162333981A3DA69FC46AAA10BE776391ED4AB0B1849CBEAAD7`
- Rollback hash passed: `46DE6935E6288A52153A7D9A267E848C2FD193F0B02BC60A3A59AA2738433CE9`

Current detailed baseline hashes are recorded in [staging-bootstrap-and-security-results.md](C:/college-date/docs/native-android/staging-bootstrap-and-security-results.md).

## Anonymous Tests

Metadata-level anonymous tests passed:

- `anon` has no `SELECT` privilege on `public.profiles`.
- `anon` has no `SELECT` privilege on `public.discovery_feed_v3`.
- `anon` has no `SELECT` privilege on `public.leaderboard_unified`.
- `anon` has no `SELECT` privilege on `public.optimized_confessions`.
- `anon` cannot execute authenticated-only RPCs.
- `anon` can execute only the intentionally public `validate_referral_code(text)`.

REST-level anonymous tests are blocked by local DNS failure for `pxobauvatbjncluuunyq.supabase.co`.

## Owner Tests

Blocked. Disposable staging Auth users could not be created because:

- SQL writes to `auth.users` were rejected by the connected tooling/platform.
- REST Auth signup/login/password-reset calls could not run locally because DNS resolution for `pxobauvatbjncluuunyq.supabase.co` fails on this workstation.

## Non-Owner Tests

Blocked for live sessions.

Policy review shows the final production-intended state is not strict enough for non-owner private profile isolation yet: the transitional authenticated policy `Authenticated users can read profiles for current app screens` uses `USING (true)`.

## Discovery Contract

`get_discovery_profiles(...)` was verified from connected staging function metadata/body. It returns only approved card fields and excludes email, phone, push identifiers, wallet fields, referral details, notification settings, moderation flags, AI-review fields, and admin flags.

Native discovery must use `get_discovery_profiles(...)`. It must not query `profiles.select('*')` or `discovery_feed_v3` directly.

## Rollback Rehearsal

Passed.

1. Remediated state was captured.
2. Rollback was applied to staging.
3. Rollback restored the old broad anonymous access contract and set `leaderboard_unified` to `security_invoker=false`.
4. Remediation was reapplied.
5. Final staging state again blocks anonymous profile/view reads and sets `leaderboard_unified` to `security_invoker=true`.

## Advisor Findings

Security advisor:

- Deferred later-phase tables have RLS enabled with no policies. This keeps those tables closed until reviewed.
- `validate_referral_code(text)` is intentionally anonymous-callable.
- Authenticated app-facing `SECURITY DEFINER` RPC warnings remain and require live session testing.

Performance advisor:

- Six unindexed foreign-key INFO findings remain.
- Many unused-index INFO findings are expected in empty staging.
- `profiles` has multiple permissive policies due duplicate baseline plus remediation owner policies.

## Functional Smoke Results

| Flow | Result |
| --- | --- |
| Registration | Blocked by DNS/Auth access |
| Login | Blocked by DNS/Auth access |
| Password reset | Blocked by DNS/Auth access |
| Onboarding | Blocked by missing Auth test users |
| Own profile read/update | Blocked by missing Auth test users |
| Discovery | Metadata contract passed; live test blocked |
| Swipe/match | Metadata only; live test blocked |
| Leaderboard | Metadata contract passed; live test blocked |
| Confessions/reactions | Metadata contract passed; live test blocked |
| Messaging/payments/push/calls | Deferred and not tested |

## Recommendation

Do not promote to production and do not begin native Android Phase 2 yet. The remediation is safe to continue testing in staging, but production needs live disposable-user RLS/RPC tests and removal or replacement of the broad transitional authenticated profile policy.
