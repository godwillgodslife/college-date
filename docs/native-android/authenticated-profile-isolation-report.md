# Authenticated Profile Isolation Report

Date: 2026-08-01

Project: `College Date Staging` / `pxobauvatbjncluuunyq`

Production project `gedoyoleoscgxgdqszzc` was not accessed or modified.

## Objective

Validate that direct authenticated profile access is owner-only and that all non-owner profile exposure now happens through intentionally narrow RPC contracts.

## Root Cause

The original anonymous profile-access issue was caused by broad public access to `public.profiles` and profile-derived views. The follow-up authenticated exposure was caused by a transitional authenticated `profiles SELECT USING (true)` policy and direct client grants on broad profile-derived views.

The staging remediation removes both classes of exposure:

- anonymous direct table/view access remains blocked;
- authenticated direct `profiles` access is owner-only through RLS;
- raw profile-derived views are not granted to client roles;
- non-owner discovery and matched-profile reads are mediated by reviewed RPCs that derive caller identity from `auth.uid()`.

## Migration

Applied in staging:

- `supabase/migrations/20260801163000_restrict_authenticated_profile_access.sql`
- SHA-256: `D2793AE8BF87107EEF98A7E5239956806DD703EAE38B22BCEFFAB08818D34EBC`

Rollback rehearsed in staging:

- `docs/native-android/authenticated-profile-isolation-rollback.sql`
- SHA-256: `DFF9D1F6B2EABB6388123588A17D3C30573B4DAEBC4A6BCF5BA0149FCB46A096`

The Supabase CLI migration generator was not available on this workstation, so the timestamped migration file was created manually.

## Final Staging Metadata

| Check | Result |
| --- | --- |
| `profiles` policy count | 4 |
| Broad authenticated profile read policy | Absent |
| Public profile read policy | Absent |
| `anon` profile policy | Absent |
| `anon` can select `profiles` | No |
| `authenticated` can select `profiles` | Yes, constrained by owner-only RLS |
| `authenticated` table-level update on `profiles` | No |
| `authenticated` can update protected profile fields | No |
| Raw `discovery_feed_v3` client grants | No `anon` or `authenticated` select |
| Raw `leaderboard_unified` client grants | No `anon` or `authenticated` select |
| Raw `optimized_confessions` client grants | No `anon` or `authenticated` select |
| All three reviewed views use `security_invoker` | Yes |

Reviewed views:

| View | Owner | `security_invoker` | `anon` select | `authenticated` select |
| --- | --- | --- | --- | --- |
| `discovery_feed_v3` | `postgres` | `true` | No | No |
| `leaderboard_unified` | `postgres` | `true` | No | No |
| `optimized_confessions` | `postgres` | `true` | No | No |

Reviewed app-facing RPCs:

| Function | SECURITY DEFINER | `search_path` | `anon` execute | `authenticated` execute |
| --- | --- | --- | --- | --- |
| `apply_referral_code(p_code text)` | Yes | `''` | No | Yes |
| `get_confession_feed(p_university text, p_limit integer, p_offset integer)` | Yes | `''` | No | Yes |
| `get_discovery_profiles(p_limit integer, p_offset integer, p_filters jsonb)` | Yes | `''` | No | Yes |
| `get_leaderboard_profiles(p_kind text, p_limit integer)` | Yes | `''` | No | Yes |
| `get_matched_profile(p_profile_id uuid)` | Yes | `''` | No | Yes |
| `toggle_confession_reaction(p_confession_id uuid, p_emoji text)` | Yes | `''` | No | Yes |
| `validate_referral_code(p_code text)` | Yes | `''` | Yes, intentional | Yes |

## Runtime Isolation Results

Final runtime pass: 69 passed, 0 failed.

| Area | Result |
| --- | --- |
| Owner can read own profile | Passed |
| Owner can update approved self fields | Passed |
| Owner can complete onboarding through approved fields | Passed |
| Owner cannot update protected fields | Passed |
| Owner cannot change profile ownership | Passed |
| Owner cannot directly read another full profile | Passed |
| Non-owner cannot directly read another full profile | Passed |
| Non-owner cannot update another profile | Passed |
| Anonymous direct profile access | Passed, rejected |
| Discovery RPC returns safe card fields only | Passed |
| Matched-profile RPC returns safe matched fields only | Passed |
| Blocked/reported profile access through RPC | Passed, filtered |
| Leaderboard RPC exposes only public leaderboard fields | Passed |
| Confession feed excludes author identity fields | Passed |

Protected direct-update fields denied at runtime:

- `is_premium`
- `premium_expires_at`
- `coins`
- `referral_code`
- `is_banned`
- `push_token`
- `ai_verification_status`
- `ai_review_summary`
- `ai_review_flags`
- `is_shadow_banned`

## Safe Access Contracts

| Surface | Contract |
| --- | --- |
| Current user profile | Direct `profiles` owner-only RLS or `get_current_profile()` |
| Owner profile edit | Column-limited owner update or `update_current_profile(jsonb)` |
| Discovery cards | `get_discovery_profiles(...)` |
| Matched-user profile | `get_matched_profile(uuid)` |
| Leaderboard | `get_leaderboard_profiles(text, integer)` |
| Confessions feed | `get_confession_feed(text, integer, integer)` |
| Confession reactions | `toggle_confession_reaction(uuid, text)` |
| Referral validation | `validate_referral_code(text)`, intentionally public |
| Referral application | `apply_referral_code(text)`, authenticated only |

Native Android and web clients should not query `profiles`, `discovery_feed_v3`, `leaderboard_unified`, or `optimized_confessions` for non-owner profile surfaces.

## Auth Trigger Finding

Staging Auth user creation surfaced a profile bootstrap bug in `public.handle_new_user()`: if Auth user metadata omits `gender`, the trigger can attempt to insert a `profiles.gender = null` value because the null check does not catch `NULL NOT IN (...)`.

Runtime fixtures worked by passing complete lowercase profile metadata during admin user creation. Before production signup hardening, update or review the trigger so missing or malformed metadata falls back safely without violating `profiles.gender NOT NULL`.

## Advisor Results

Security advisors:

- Duplicate permissive `profiles` policy findings are resolved.
- Remaining `rls_enabled_no_policy` INFO findings are for schema-only/deferred tables that are closed by RLS until their feature contracts are reviewed.
- `validate_referral_code(text)` remains an intentional anonymous `SECURITY DEFINER` RPC.
- Authenticated `SECURITY DEFINER` warnings remain for app-facing RPCs and must be accepted or hardened function-by-function before production apply.
- Supabase Auth leaked-password protection is disabled.

Performance advisors:

- Six unindexed foreign-key INFO findings remain:
  - `admin_audit_logs.admin_user_id`
  - `admin_push_broadcasts.admin_user_id`
  - `entitlements.product_id`
  - `payment_attempts.product_id`
  - `swipe_payment_operations.swiped_id`
  - `wallet_ledger.wallet_id`
- Many unused-index INFO findings remain expected in a fresh staging project with little traffic.

## Verdict

Authenticated profile isolation is verified in staging at metadata and runtime levels. The proposed migration is safe for continued staging use and is ready for production approval review.

Production promotion is recommended only after explicit approval, fresh production read-only preflight checks, acknowledgement of the intentional `validate_referral_code` public RPC, and resolution or acceptance of the Auth trigger and advisor caveats above.
