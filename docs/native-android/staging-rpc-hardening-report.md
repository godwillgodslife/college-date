# Staging RPC Hardening Report

Date: 2026-08-01

Staging project: `College Date Staging` (`pxobauvatbjncluuunyq`)

Production project `gedoyoleoscgxgdqszzc` was not accessed or modified during the staging apply pass.

## Package

Applied local package:

- `supabase/baseline/035_required_functions_hardened.sql`
- Current SHA-256: `528C4B85DD6B7482B02F235840BDC674B604397192C73E185B9DB561C4D85917`

The hash changed from the earlier static-review package because `public.calculate_completion_score()` was simplified for successful staging application. The updated body computes directly from the trigger `new` row and preserves the intended completion-score behavior.

## Functions In Scope

The staging package creates the following 21 College Date functions:

- `normalize_referral_code(text)`
- `generate_referral_code()`
- `generate_unique_referral_code()`
- `handle_new_profile_referral()`
- `sync_referral_from_profile()`
- `handle_new_user()`
- `validate_referral_code(text)`
- `apply_referral_code(text)`
- `calculate_completion_score()`
- `update_photo_timestamp()`
- `get_current_profile()`
- `update_current_profile(jsonb)`
- `update_user_presence()`
- `check_and_reset_swipe_limit(uuid)`
- `get_discovery_profiles(integer, integer, jsonb)`
- `record_feed_impression(text, uuid, text, boolean)`
- `record_profile_swipe(uuid, text, text, text, text)`
- `accept_swipe_request(uuid)`
- `get_leaderboard_profiles(text, integer)`
- `get_confession_feed(text, integer, integer)`
- `toggle_confession_reaction(uuid, text)`

## Staging Apply Result

The function package was applied to staging in reviewed chunks after the connector rejected the original `calculate_completion_score()` body with `INVALID_ARGUMENT`.

Successful applied chunks:

- `baseline_035a_referral_profile_bootstrap`
- `p035b1_completion_score`
- `p035b2_profile_read`
- `p035b3_profile_update_presence`
- `p035c_discovery_quota`
- `p035d_feed_swipe`
- `p035e_match_leaderboard_confessions`
- `p035f_triggers_grants`

Rejected chunks:

- `baseline_035b_profile_onboarding_rpcs`
- `baseline_035b_profile_read_rpcs`

The rejected chunks did not partially execute. Function presence was checked before continuing.

## Security Properties Verified

Connected staging metadata shows:

- 21 College Date functions exist.
- 14 College Date functions are `SECURITY DEFINER`.
- 7 College Date functions are `SECURITY INVOKER`.
- All 21 College Date functions set `search_path` to `''`.
- Default `PUBLIC` function execution was revoked.
- `anon` can execute only `validate_referral_code(text)`.
- `authenticated` can execute only the approved app-facing RPC subset.
- Trigger/internal functions are not executable by `anon` or `authenticated`.

The staging project still has one pre-existing public helper, `public.rls_auto_enable()`. It is `SECURITY DEFINER` with `search_path=pg_catalog`, but client/PUBLIC execute access has been revoked.

## Discovery RPC Contract

`get_discovery_profiles(...)` was verified from live staging metadata/body.

It derives caller identity from `auth.uid()`, clamps `p_limit` to `1..50`, rejects unauthenticated/missing/incomplete/banned callers, excludes prior swipes and existing matches, and returns only approved card fields.

It does not return:

- email
- phone
- push identifiers
- wallet data
- referral details
- notification preferences
- moderation flags
- AI-review fields
- admin/internal flags

See [native-discovery-rpc-contract.md](C:/college-date/docs/native-android/native-discovery-rpc-contract.md).

## Deferred Functions

Still deferred:

- Paystack and RevenueCat functions.
- Wallet deposit, withdrawal, increment, decrement, ledger, and settlement functions.
- Premium entitlement and paid-product functions.
- Super Swipe and boost purchase/consumption functions.
- Referral reward and matured reward processing beyond code application.
- Push notification/device functions.
- Voice/video call functions.
- Admin functions and production maintenance jobs.
- Messaging, disappearing-message, status, snapshot, viewer, and admirer RPCs.

## Functional RPC Tests

Live caller tests are blocked because disposable staging Auth users could not be created:

- SQL writes into `auth.users` were rejected by Supabase tooling/platform restrictions.
- Local REST calls to `https://pxobauvatbjncluuunyq.supabase.co` fail DNS resolution on this workstation.

No test passwords, tokens, profile rows, or private user data were printed or committed.

## Advisor Results

Security advisor still warns about:

- intentionally public `validate_referral_code(text)`;
- authenticated app-facing `SECURITY DEFINER` RPCs;
- RLS-enabled later-phase tables without policies.

Performance advisor still warns about:

- six unindexed foreign keys;
- unused indexes in empty staging;
- duplicate permissive `profiles` policies.

These findings are documented blockers before production promotion, not auto-fixed in this scoped pass.

## Verdict

The hardened RPC package is applied and metadata-verified in staging. It is not production-approved until live disposable-user RPC/RLS tests pass and the transitional direct authenticated `profiles` access is replaced or explicitly accepted.
