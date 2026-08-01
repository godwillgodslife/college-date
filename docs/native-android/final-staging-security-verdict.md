# Final Staging Security Verdict

Date: 2026-08-01

Project: `College Date Staging` / `pxobauvatbjncluuunyq`

Production project `gedoyoleoscgxgdqszzc` was not accessed, queried, migrated, or modified during this final staging pass.

## Verdict

Final staging Auth and RLS runtime verification passed.

| Decision | Verdict |
| --- | --- |
| Staging profile RLS state | Passed |
| Anonymous profile access | Blocked |
| Authenticated direct full-profile access | Owner-only |
| Safe discovery contract | Verified |
| Safe matched-profile contract | Verified |
| Referral runtime contract | Verified |
| Confessions feed/reaction contract | Verified |
| Leaderboard contract | Verified |
| Auth login/session/logout runtime | Verified |
| Runtime failures | 0 |
| Production promotion | Candidate only; requires explicit approval |
| Native Android Phase 2 | Safe to begin against staging for verified contracts |

## Runtime Results

Final run id: `20260801154918`

| Metric | Result |
| --- | ---: |
| Confirmed synthetic staging users | 13 |
| Checks passed | 69 |
| Checks failed | 0 |

No passwords, access tokens, refresh tokens, Supabase service-role keys, payment secrets, or private user records were stored or printed.

## Root Cause Confirmed

The original profile exposure came from a broad public `profiles` policy and anonymous grants on profile-derived views. The authenticated exposure risk came from a transitional authenticated `profiles SELECT USING (true)` policy and direct client grants on broad views.

The staging state now removes those unsafe access paths. Clients can read their own `profiles` row through owner-only RLS, while discovery, matched-profile, leaderboard, confessions, and referrals use narrow RPC contracts that derive the caller from `auth.uid()`.

## Test Coverage

Passed runtime areas:

- Owner can read and update approved own profile fields.
- Owner cannot update protected Premium, wallet, referral, moderation, push, AI-review, or ownership fields.
- Owner cannot directly read another full profile.
- Non-owner cannot directly read or update another profile.
- Anonymous clients cannot read `profiles` or authenticated-only RPCs.
- Discovery returns only safe card fields and excludes caller, prior swipes, and blocked/reported users.
- Matched-profile RPC returns safe fields only for actual matches.
- Blocked/reported matched-profile access returns no row.
- Referral validation/application handles anonymous validation, authenticated application, self-referral denial, duplicate prevention, and direct row manipulation denial.
- Confession feed hides author identity and reaction writes are current-user scoped.
- Leaderboard returns only display/rank/score fields.
- Login, session refresh, logout, invalid-session handling, and network-error signaling were verified.

## Advisor Results

Security advisors still report:

- `rls_enabled_no_policy` INFO findings for deferred schema-only tables.
- Intentional anonymous `SECURITY DEFINER` warning for `validate_referral_code(text)`.
- Authenticated `SECURITY DEFINER` warnings for reviewed app-facing RPCs.
- Supabase Auth leaked-password protection disabled.

Performance advisors still report:

- Six unindexed foreign-key INFO findings.
- Many unused-index INFO findings expected in a low-traffic staging project.

None of these findings invalidates the profile RLS runtime result, but each must be accepted or remediated before production promotion.

## Remaining Blockers

1. Production promotion is blocked until the product owner explicitly approves the production write.
2. A fresh production read-only metadata preflight must be run immediately before any production migration.
3. The Auth trigger `public.handle_new_user()` should be patched or explicitly accepted because missing `gender` metadata can violate `profiles.gender NOT NULL`.
4. The intentional public `validate_referral_code(text)` RPC needs product-owner/security acceptance.
5. Authenticated `SECURITY DEFINER` RPCs need final function-by-function production approval.
6. Leaked-password protection should be enabled or explicitly deferred.
7. Payment, wallet, Premium, notifications, calls, full messaging, and admin surfaces remain out of scope.

## Production Recommendation

Recommend moving the profile RLS package to a formal production approval step, not applying it automatically.

The production approval step should include:

- exact migration and rollback SQL;
- production read-only preflight results;
- affected client contract review;
- owner acceptance of intentional RPC warnings;
- rollback owner and window;
- post-apply anonymous, owner, and non-owner probes.

## Phase 2 Recommendation

Native Android Phase 2 may begin against staging for:

- auth/session routing;
- onboarding/profile-state routing;
- current-user profile reads and permitted edits;
- discovery cards via `get_discovery_profiles(...)`;
- matched-profile detail via `get_matched_profile(uuid)`;
- referral validation/application;
- leaderboard display;
- confessions feed and reactions.

Do not begin wallet, payments, Premium, push notifications, calls, full messaging, or admin features until those surfaces receive separate staging RLS/runtime verification.
