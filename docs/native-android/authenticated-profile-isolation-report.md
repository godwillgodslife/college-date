# Authenticated Profile Isolation Report

Date: 2026-08-01

Project: `College Date Staging` / `pxobauvatbjncluuunyq`

Production project `gedoyoleoscgxgdqszzc` was not accessed or modified.

## Objective

Remove the first-stage transitional authenticated `profiles SELECT USING (true)` policy and replace it with narrow profile access contracts suitable for native Android.

## Migration

Created and applied:

- `supabase/migrations/20260801163000_restrict_authenticated_profile_access.sql`
- SHA-256: `D2793AE8BF87107EEF98A7E5239956806DD703EAE38B22BCEFFAB08818D34EBC`

Rollback created and rehearsed:

- `docs/native-android/authenticated-profile-isolation-rollback.sql`
- SHA-256: `DFF9D1F6B2EABB6388123588A17D3C30573B4DAEBC4A6BCF5BA0149FCB46A096`

The Supabase CLI migration generator was not available on this workstation, so the timestamped migration filename was created manually and this limitation is documented.

## What Changed

- Removed `Authenticated users can read profiles for current app screens`.
- Removed duplicate first-stage profile owner policies.
- Recreated exactly four owner-only `profiles` policies:
  - select own profile
  - insert own profile
  - update own profile
  - delete own profile
- Removed direct client grants on:
  - `discovery_feed_v3`
  - `leaderboard_big_spenders`
  - `leaderboard_campus_stars`
  - `leaderboard_most_wanted`
  - `leaderboard_unified`
  - `optimized_confessions`
- Kept all profile-derived views as `security_invoker=true`.
- Added `get_matched_profile(uuid)` as the safe matched-user profile contract.
- Replaced broad authenticated table update with column-level `profiles` update grants.

## Final Staging State

| Check | Result |
| --- | --- |
| Profile policy count | 4 |
| Broad authenticated profile read policy | Absent |
| Public profile read policy | Absent |
| `anon` can select `profiles` | No |
| `authenticated` can select `profiles` | Yes, constrained by owner-only RLS |
| Client grants on raw profile-derived views | 0 |
| `get_matched_profile(uuid)` present | Yes |
| `get_matched_profile(uuid)` anonymous execute | No |
| `get_matched_profile(uuid)` authenticated execute | Yes |
| `get_matched_profile(uuid)` `search_path` | `''` |
| Profiles rows | 0 |
| Matches rows | 0 |
| Reports rows | 0 |
| Confessions rows | 0 |
| Storage objects | 0 |

## Column-Level Write Controls

Allowed direct owner update example:

- `full_name`

Denied protected direct owner updates:

- `is_premium`
- `premium_expires_at`
- `coins`
- `referral_code`
- `is_banned`
- `push_token`
- `ai_review_summary`

Direct owner profile editing should still prefer `update_current_profile(jsonb)`.

## Safe Access Contracts

| Surface | Contract |
| --- | --- |
| Current user profile | Direct `profiles` owner-only RLS or `get_current_profile()` |
| Discovery profile | `get_discovery_profiles(...)` only |
| Matched-user profile | `get_matched_profile(uuid)` only |
| Leaderboard | `get_leaderboard_profiles(text, integer)` only |
| Confessions | `get_confession_feed(text, integer, integer)` and `toggle_confession_reaction(uuid, text)` |
| Referral validation | `validate_referral_code(text)` only public RPC |

## Anonymous REST Results

Final staging after rollback/reapply:

| Probe | Result |
| --- | --- |
| `profiles?select=id&limit=1` | `401` |
| `discovery_feed_v3?select=*&limit=1` | `401` |
| `leaderboard_unified?select=*&limit=1` | `401` |
| `optimized_confessions?select=*&limit=1` | `401` |
| `rpc/get_discovery_profiles` | `401` |
| `rpc/get_matched_profile` | `401` |
| `rpc/get_leaderboard_profiles` | `401` |
| `rpc/get_confession_feed` | `401` |
| `rpc/validate_referral_code` | `200` |

No profile rows were selected or printed.

## Runtime Owner/Non-Owner Tests

Blocked.

Disposable staging Auth users could not be created or confirmed:

- public signup reaches staging but `.test` and `example.com` synthetic domains are rejected;
- app-domain synthetic signup hit `over_email_send_rate_limit`;
- connected tools do not expose Auth admin user creation;
- direct SQL insert into `auth.users` was not used because it is disallowed.

## Rollback Rehearsal

Passed.

1. Applied stricter migration.
2. Verified hardened metadata state.
3. Applied rollback.
4. Verified rollback restored the first-stage transitional authenticated baseline:
   - broad authenticated profile read policy present;
   - authenticated raw view grants restored;
   - `get_matched_profile(uuid)` removed;
   - anonymous profile access still blocked.
5. Reapplied stricter migration.
6. Verified final hardened state.

Staging ended hardened.

## Advisor Results

Security advisor:

- Duplicate permissive `profiles` policy finding is gone.
- Remaining `rls_enabled_no_policy` INFO findings are for deferred later-phase tables.
- `validate_referral_code(text)` remains intentionally anonymous-callable.
- Authenticated app-facing `SECURITY DEFINER` RPC warnings remain, including the new `get_matched_profile(uuid)`.

Performance advisor:

- Six unindexed foreign-key INFO findings remain:
  - `admin_audit_logs.admin_user_id`
  - `admin_push_broadcasts.admin_user_id`
  - `entitlements.product_id`
  - `payment_attempts.product_id`
  - `swipe_payment_operations.swiped_id`
  - `wallet_ledger.wallet_id`
- Unused-index INFO findings remain expected because staging has no traffic.

## Verdict

The authenticated profile isolation migration is metadata-verified and rollback-tested in staging. It is a safer production candidate than the first-stage remediation because it removes broad authenticated profile reads and raw profile-derived view access.

Production promotion is still not recommended until disposable confirmed staging users are available and owner/non-owner runtime tests pass.

Native Android Phase 2 should not begin yet.
