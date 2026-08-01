# Staging RPC Hardening Report

Date: 2026-08-01

Production project inspected: `College Date` (`gedoyoleoscgxgdqszzc`)

Staging project target: `College Date Staging` (`pxobauvatbjncluuunyq`)

No production writes were executed. No staging writes were executed. No user records were selected.

## 1. Production Functions Inspected

- 104 public PostgreSQL functions were inventoried from production metadata.
- 100 functions are `SECURITY DEFINER`.
- 4 functions are `SECURITY INVOKER`.
- 1 function, `public.process_referral_rewards()`, has mutable `search_path`.
- Production trigger metadata was inspected for `auth` and `public` tables.
- Production advisors were run for security and performance.

## 2. Required Functions Selected

Created local SQL package:

- `supabase/baseline/035_required_functions_hardened.sql`

Approved first-scope functions:

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

## 3. Functions Deferred

- Paystack and RevenueCat functions.
- Wallet deposit, withdrawal, increment, decrement and ledger settlement functions.
- Premium entitlement and paid-product functions.
- Super Swipe and boost purchase/consumption functions.
- Referral reward and matured reward processing.
- Push notification/device functions.
- Edge-calling notification triggers.
- Voice/video call functions.
- Admin functions and production maintenance jobs.
- Messaging, disappearing-message, status, snapshot and viewer/admirer RPCs.

## 4. Unsafe Functions Excluded

Excluded functions include:

- `process_swipe_payment(...)`: wallet mutation and paid swipe behavior.
- `send_super_swipe(uuid)`: consumes boost credits.
- `accept_swipe_request(uuid)` production body: credits wallet rewards and calls notification helpers; replaced with a no-wallet staging implementation.
- `calculate_completion_score(uuid)`: production has PUBLIC/anon/auth grants and trusts caller-supplied user id.
- `process_referral_rewards()`: mutable `search_path` and wallet reward side effects.
- `insert_notification(...)`: advisor reports anon-callable definer overloads.
- `purchase_premium_with_wallet(text)`: advisor reports anon-callable definer function.
- `request_wallet_withdrawal(...)`: advisor reports anon-callable definer function.
- `register_notification_device(...)` and `revoke_notification_device(...)`: advisor reports anon-callable definer functions.
- `get_admirers_secure(...)` and `get_profile_viewers_secure(...)`: deferred premium surfaces; advisor reports anon-callable definer functions.
- All `admin_*` functions.

## 5. `SECURITY DEFINER` Functions Retained

| Function | Justification |
|---|---|
| `generate_unique_referral_code()` | Needs cross-profile referral-code collision check while direct profile reads are restricted. |
| `handle_new_profile_referral()` | Trigger must write generated referral code during profile insert. |
| `sync_referral_from_profile()` | Trigger must create referral attribution row without broad client grants. |
| `handle_new_user()` | Auth trigger must create profile/support rows after signup. |
| `validate_referral_code(text)` | Anonymous signup must validate code without direct profile reads. |
| `apply_referral_code(text)` | Authenticated user applies referral by code without direct cross-profile/referral table writes. |
| `check_and_reset_swipe_limit(uuid)` | Needs to create/update quota rows and read subscription state; now self-scoped. |
| `get_discovery_profiles(...)` | Needs cross-profile discovery without broad profile table/view grants. |
| `record_feed_impression(...)` | Keeps feed impression table closed while recording caller-owned impressions. |
| `record_profile_swipe(...)` | Needs atomic cross-table swipe/quota/match writes while direct tables remain closed. |
| `accept_swipe_request(uuid)` | Needs to update incoming swipe and create match while verifying recipient. |
| `get_leaderboard_profiles(...)` | Needs safe cross-profile aggregate reads without exposing wallet spend. |
| `get_confession_feed(...)` | Needs safe confession aggregate reads without exposing author/reaction identities. |
| `toggle_confession_reaction(...)` | Keeps reaction table closed while recording caller-owned reaction. |

All retained definer functions set `search_path` to `''`, schema-qualify referenced tables/functions, validate `auth.uid()` where callable, and revoke default `PUBLIC` execution.

## 6. Anonymous Execution Grants Removed

The SQL package revokes `PUBLIC`, `anon`, and `authenticated` execution from every function first, then grants:

- `anon, authenticated`: `validate_referral_code(text)` only.
- `authenticated`: approved application RPCs only.
- No client grants: trigger functions and internal helpers.

## 7. Mutable `search_path` Issues Corrected

Every function in `035_required_functions_hardened.sql` has:

```sql
set search_path to ''
```

The production function `process_referral_rewards()` remains excluded.

## 8. Trigger Dependencies Resolved

Preserved or created in the staging package:

- `auth.users -> handle_new_user()`
- `profiles -> handle_new_profile_referral()`
- `profiles -> sync_referral_from_profile()`
- `profiles -> update_photo_timestamp()`
- `profiles -> calculate_completion_score()`

Deferred:

- notification triggers
- premium auto-match trigger
- referral reward triggers
- wallet transaction trigger
- message/profile-view notification triggers

`supabase/baseline/030_functions_and_triggers.sql` now points to the reviewed package.

## 9. Discovery Contract Created

Created:

- `docs/native-android/native-discovery-rpc-contract.md`

Root change: native discovery must use `get_discovery_profiles(...)` instead of direct `profiles` or `discovery_feed_v3` reads.

## 10. SQL Validation Results

Static checks performed locally:

- SQL package manually reviewed for function ordering and referenced helper availability.
- `git diff --check` passed for the scoped package. Git reported only the existing Windows CRLF normalization warning for `supabase/baseline/030_functions_and_triggers.sql`.
- Structural SQL check found 21 `create or replace function public...` statements, 21 explicit function revokes, 13 intentional client grants, 14 retained `SECURITY DEFINER` functions, 7 `SECURITY INVOKER` functions, and 21 explicit `set search_path to ''` clauses.
- Dollar-quote balance check found 42 `$$` delimiters, matching the 21 function bodies.
- Grant coverage check confirmed every function has an explicit revoke; only approved RPCs are granted to `anon` or `authenticated`.

Limitations:

- The SQL was not applied to production or staging.
- A live parser/apply test was not performed in this pass because the task explicitly forbids remote writes.
- `psql` and the Supabase CLI were not installed on PATH in this environment, so parser-level local SQL validation was unavailable.
- Final staging readiness still requires applying to a disposable staging database or transaction and running Supabase advisors there.

## 11. Secret and Personal-Data Scan Results

Scoped secret scan passed. It found no JWT-like Supabase keys, privileged Supabase server keys, Paystack secrets, RevenueCat secrets, Firebase API keys, OpenRouter API keys, or OpenAI-style secret keys in the new SQL/docs package.

Scoped personal-data scan passed with expected SQL/operator/documentation hits only:

- Documentation references to migration filenames.
- SQL column names such as `email`, `phone`, and `referral_code` for current-user/profile bootstrap contracts.
- The Postgres array containment operator `@>`.

No production profile rows, user emails, phone numbers, messages, wallet records, payment records, referrals, media URLs, push tokens, or personal data exports were found.

## 12. Commit Hash

The package commit hash is recorded in the final response and, if followed by a docs-only hash-recording commit, in this section.

## 13. Is The Baseline Safe To Apply To Staging?

Status: conditionally safe for staging review after local static validation.

The package is suitable for a staging-only apply attempt because it:

- avoids production writes
- avoids payment/wallet settlement functions
- avoids push/call/admin functions
- narrows cross-profile reads to safe RPC projections
- removes default public execution grants
- uses explicit `search_path`
- validates caller identity in client-callable definer RPCs

Remaining requirement before real staging use:

- Apply to staging only after approval.
- Run staging SQL parser/apply verification.
- Run Supabase security and performance advisors on staging.
- Execute the RPC test matrix with disposable staging test users.

## 14. Remaining Blockers

- No dedicated block table was confirmed; discovery uses reports as a conservative exclusion fallback.
- Production `validate_referral_code` and `apply_referral_code` were not found in connected production metadata, although local migration evidence exists.
- Wallet/Premium/Super Swipe/payment behavior is intentionally absent.
- Notification side effects are intentionally absent.
- `leaderboard_unified` in production still has an advisor warning; the staging RPC avoids wallet spend but does not remediate production.
- Staging apply and advisor verification remain manual/approval-gated.
