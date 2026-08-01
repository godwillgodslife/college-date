# Staging Bootstrap And Security Results

Date: 2026-08-01

Scope: staging-only reconstruction and security verification for The College Date profile-access remediation. The connected Supabase project used for every remote operation was `College Date Staging` / `pxobauvatbjncluuunyq`. Production project `gedoyoleoscgxgdqszzc` was not accessed or modified.

## Staging Identity

| Field | Result |
| --- | --- |
| Project name | `College Date Staging` |
| Project reference | `pxobauvatbjncluuunyq` |
| Organization | `hekkdwsfxzaplyipyoes` |
| Region | `eu-west-1` |
| Status | `ACTIVE_HEALTHY` |
| Database | Postgres `17.6.1.155` |
| Capability observed | Read/write tooling is available; this pass used writes only against staging fixtures and treated production as forbidden. |

Initial staging bootstrap was schema-only: no production user data was copied.

## Applied Baseline And Remediation

The staging reconstruction applied the schema baseline, hardened RPC subset, anonymous-profile remediation, and authenticated-profile isolation migration:

- `supabase/migrations/20260801120000_restrict_anonymous_profile_access.sql`
- `supabase/migrations/20260801163000_restrict_authenticated_profile_access.sql`

Both rollback paths were rehearsed in staging and the hardening was reapplied afterward. Staging finished in the hardened state.

## Final Metadata State

| Check | Result |
| --- | --- |
| `profiles` policies | 4 owner-only policies |
| Broad authenticated profile-read policy | Absent |
| Public profile-read policy | Absent |
| `anon` can select `profiles` | No |
| `authenticated` can select `profiles` | Yes, owner-only through RLS |
| `authenticated` table-level update on `profiles` | No |
| Protected column update grants | Not granted |
| Direct `anon`/`authenticated` grants on `discovery_feed_v3` | No |
| Direct `anon`/`authenticated` grants on `leaderboard_unified` | No |
| Direct `anon`/`authenticated` grants on `optimized_confessions` | No |
| Reviewed raw views use `security_invoker` | Yes |

Reviewed RPC grants:

| Function | `anon` execute | `authenticated` execute | Notes |
| --- | --- | --- | --- |
| `get_discovery_profiles(...)` | No | Yes | Safe discovery card contract |
| `get_matched_profile(uuid)` | No | Yes | Safe matched-profile contract |
| `get_leaderboard_profiles(text, integer)` | No | Yes | Safe leaderboard contract |
| `get_confession_feed(text, integer, integer)` | No | Yes | Safe confession feed contract |
| `toggle_confession_reaction(uuid, text)` | No | Yes | Own-reaction operation |
| `apply_referral_code(text)` | No | Yes | Authenticated referral application |
| `validate_referral_code(text)` | Yes | Yes | Intentionally public validation |

Every reviewed function above is `SECURITY DEFINER` with `search_path = ''`.

## Staging Fixture Setup

Disposable confirmed staging users were created with a temporary staging-only Edge Function fixture because public signup could not reliably confirm synthetic addresses. The helper:

- was deployed only to `pxobauvatbjncluuunyq`;
- used a short-lived shared secret check during setup;
- kept Supabase Admin Auth/service-role use inside the Edge Function runtime;
- did not print or commit the secret, service-role key, passwords, access tokens, or refresh tokens;
- was redeployed after setup as an inert endpoint returning `410`;
- now requires JWT verification and rejects unauthenticated calls with `401`.

Final Edge Function status:

| Slug | Version | Status | JWT verification |
| --- | ---: | --- | --- |
| `codex-staging-final-rls-fixture` | 5 | Active, inert | Enabled |

## Runtime Matrix

Final run id: `20260801154918`

| Area | Passed | Failed |
| --- | ---: | ---: |
| Fixture creation and login setup | 14 | 0 |
| Owner profile isolation | 17 | 0 |
| Non-owner and anonymous isolation | 6 | 0 |
| Discovery RPC | 7 | 0 |
| Matched-profile RPC | 6 | 0 |
| Referrals | 7 | 0 |
| Confessions | 5 | 0 |
| Leaderboard | 2 | 0 |
| Auth flow/session/logout/network | 5 | 0 |
| Total | 69 | 0 |

The matrix used 13 confirmed synthetic staging users. No passwords or tokens were written to disk or documentation.

## Key Runtime Evidence

| Surface | Result |
| --- | --- |
| Anonymous direct profile access | Rejected with `401` |
| Owner direct profile read | Own row only |
| Non-owner direct profile read | Empty result |
| Non-owner update another profile | RLS filtered zero rows |
| Protected owner-field update | Rejected with `403` |
| Discovery fields | Approved card fields only |
| Discovery filters | Excludes caller, prior swipes, blocked/reported users |
| Matched-profile fields | Approved matched-profile fields only |
| Matched-profile access | Requires an actual match and rejects blocked/reported users |
| Referral application | Authenticated, self-referral denied, duplicate application prevented |
| Confession feed | No author identity fields returned |
| Confession reactions | Authenticated own-reaction operation only |
| Leaderboard | Public display fields only |
| Session refresh | Passed |
| Logout/session clearing | Passed |

## Advisor Findings

Security advisor:

- `profiles` duplicate permissive policy warning is resolved.
- Remaining `rls_enabled_no_policy` INFO findings are for schema-only/deferred tables closed by RLS until their feature policies/RPCs are reviewed.
- `validate_referral_code(text)` remains an intentional anonymous `SECURITY DEFINER` RPC.
- Authenticated `SECURITY DEFINER` warnings remain for app-facing RPCs such as discovery, matched profile, referral, leaderboard, confession, and swipe/feed helpers.
- Supabase Auth leaked-password protection is disabled.

Performance advisor:

- Six unindexed foreign-key INFO findings remain:
  - `admin_audit_logs.admin_user_id`
  - `admin_push_broadcasts.admin_user_id`
  - `entitlements.product_id`
  - `payment_attempts.product_id`
  - `swipe_payment_operations.swiped_id`
  - `wallet_ledger.wallet_id`
- Many unused-index INFO findings are expected in a fresh staging project with limited traffic.

No advisor finding was auto-fixed during this final pass.

## Staging Caveats

1. The `public.handle_new_user()` Auth trigger can fail when required metadata such as `gender` is missing; the fixture worked by passing complete metadata. This should be patched or explicitly accepted before production signup hardening.
2. Confession reaction emoji constraints appear to include mojibake values in staging; this should be cleaned up before a confessions feature phase.
3. The temporary fixture helper is inert and JWT-protected, but it still exists in staging for auditability. Remove it later with an approved staging cleanup operation if desired.
4. Earlier failed setup attempts may have left synthetic `codex.final.*@thecollegedate.com` staging users. They were not deleted in this pass.
5. Payment, wallet, Premium, notifications, calls, full messaging, and admin flows remain out of scope for this profile RLS runtime pass.

## Production Promotion Recommendation

The staging profile RLS and authenticated isolation package is ready for production approval review. It should not be applied automatically.

Before production apply, the owner must approve the exact production operation, run a fresh production read-only preflight, accept or remediate the Auth trigger and advisor findings, assign rollback/monitoring owners, and run post-apply smoke tests.

## Native Android Phase 2 Verdict

Native Android Phase 2 may begin against staging for auth, onboarding/profile-state routing, discovery, matched-profile, referral, leaderboard, and confessions feed contracts.

Do not begin payments, wallet, Premium, notifications, calls, full messaging, or admin work until those feature surfaces receive their own staging RLS/runtime verification.
