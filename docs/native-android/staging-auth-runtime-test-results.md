# Staging Auth Runtime Test Results

Date: 2026-08-01

Project: `College Date Staging` / `pxobauvatbjncluuunyq`

Production project `gedoyoleoscgxgdqszzc` was not accessed or modified.

## Summary

Final staging Auth and RLS runtime verification passed.

| Result | Count |
| --- | ---: |
| Runtime checks passed | 69 |
| Runtime checks failed | 0 |
| Confirmed synthetic staging users in final run | 13 |

The previous blocker around public signup and email confirmation was resolved by using a short-lived staging-only server-side fixture helper. The helper used Supabase Admin Auth only inside the staging Edge Function runtime, did not expose the service-role key to the client, and was redeployed as an inert JWT-protected endpoint after setup.

No passwords, access tokens, refresh tokens, service-role keys, or private profile rows were stored in this repository or printed in the report.

## Auth Configuration

| Check | Result |
| --- | --- |
| Connected project | `College Date Staging` |
| Project ref | `pxobauvatbjncluuunyq` |
| Region | `eu-west-1` |
| Email Auth provider | Enabled |
| Public signup | Enabled |
| Mailer autoconfirm | Disabled |
| Phone Auth | Disabled |
| OAuth providers | Disabled in staging settings response |
| Production SMTP/Auth settings changed | No |

Public signup remained unsuitable for this runtime pass because synthetic domains were rejected and app-domain signup had previously hit Supabase Auth email rate limits. Disposable confirmed users were therefore created administratively in staging only.

## Synthetic Users

Final run id: `20260801154918`

| Label | User id | Email |
| --- | --- | --- |
| Owner A | `deb1cb02-383b-4880-8d55-f01206a11e87` | `codex.final.20260801154918.owner-a@thecollegedate.com` |
| Owner B | `76e0d091-d09d-4499-b9ef-b6350c6b76c6` | `codex.final.20260801154918.owner-b@thecollegedate.com` |
| Owner C | `ba96098d-4eec-46d0-a4ed-0bf7f6327cac` | `codex.final.20260801154918.owner-c@thecollegedate.com` |
| Discovery candidate | `951b7bd1-3833-4c46-a7a8-115118406607` | `codex.final.20260801154918.discovery-candidate@thecollegedate.com` |
| Non-owner | `57e4eb90-04a6-4db6-99d8-e6db85e0b4b9` | `codex.final.20260801154918.non-owner@thecollegedate.com` |
| Blocked A | `a190154d-07ee-484a-b448-db6f4895489f` | `codex.final.20260801154918.blocked-a@thecollegedate.com` |
| Blocked B | `91e1bb6c-f483-4770-87af-3a39a5a9f89e` | `codex.final.20260801154918.blocked-b@thecollegedate.com` |
| Matched A | `28661a5c-cb06-4746-9875-276e80e1618c` | `codex.final.20260801154918.matched-a@thecollegedate.com` |
| Matched B | `3cf4a5d1-77e9-4e3c-8335-4bccfbe6d23d` | `codex.final.20260801154918.matched-b@thecollegedate.com` |
| Referral owner | `82cb7f51-b12e-44d2-abbe-da69d97aff6d` | `codex.final.20260801154918.referral-owner@thecollegedate.com` |
| Referred user | `cc8e9279-2771-404c-86cf-8207be090109` | `codex.final.20260801154918.referred-user@thecollegedate.com` |
| Confession author | `2beb88ad-4de5-4995-a81a-bbb886bfdf61` | `codex.final.20260801154918.confession-author@thecollegedate.com` |
| Leaderboard participant | `fb718a1d-ecd5-4fd6-bf7b-6200be2155b0` | `codex.final.20260801154918.leaderboard-participant@thecollegedate.com` |

Fixture records:

- Confession id: `06776fa0-39de-496e-b620-4e3757f9c859`
- Referral code: `CDR154918X`

Earlier failed fixture attempts may have left additional synthetic staging-only `codex.final.*@thecollegedate.com` records. They were not deleted in this pass so test evidence remains intact. Cleanup can be performed later by an approved staging admin operation.

## Owner Runtime Tests

| Test | Result |
| --- | --- |
| Owner can read own permitted/full profile | Passed, `200`, 1 row |
| Owner cannot direct-read another full profile | Passed, `200`, 0 rows |
| Owner can update an approved own field | Passed, `204` |
| Incomplete-profile state readable by owner | Passed, `200` |
| Owner can complete onboarding through approved fields | Passed, `204` |
| Completed-profile state readable by owner | Passed, `200` |
| Owner cannot change profile ownership/id | Passed, `403` |

Protected owner-field update attempts all returned `403`:

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

## Non-Owner Runtime Tests

| Test | Result |
| --- | --- |
| Non-owner cannot select another full profile directly | Passed, `200`, 0 rows |
| Non-owner cannot update another profile | Passed, `204`, RLS filtered 0 rows |
| Caller-supplied identity override rejected by `get_matched_profile` | Passed, `404` |
| Invalid session rejected | Passed, `401` |

## Anonymous Runtime Tests

| Test | Result |
| --- | --- |
| Anonymous direct `profiles` access | Passed, `401` |
| Anonymous `get_discovery_profiles` | Passed, `401` |
| Anonymous `get_matched_profile` | Passed, `401` |
| Anonymous `get_leaderboard_profiles` | Passed, `401` |
| Anonymous `get_confession_feed` | Passed, `401` |
| Anonymous `validate_referral_code` | Passed, `200`, intentionally public |

## Discovery RPC Tests

`get_discovery_profiles(p_limit integer, p_offset integer, p_filters jsonb)` passed runtime verification.

| Test | Result |
| --- | --- |
| Authenticated discovery returns approved safe fields only | Passed, `200`, 11 rows |
| Limit clamps to maximum 50 | Passed |
| Caller is excluded | Passed |
| Prior swipes are excluded | Passed |
| Blocked/reported users are excluded | Passed |
| High offset returns empty array safely | Passed, `200`, 0 rows |
| Anonymous caller rejected | Passed, `401` |
| Supplied current-user identity is not accepted as authoritative | Passed |

Returned keys observed:

`age`, `anthem`, `attraction_goal`, `avatar_url`, `bio`, `completion_score`, `department`, `faculty`, `full_name`, `gender`, `id`, `interests`, `intro_prompt`, `is_boosted`, `is_live`, `is_verified`, `last_active`, `last_seen_at`, `level`, `photos`, `profile_photos`, `seen_count`, `university`, `username`, `voice_intro_url`.

No email, phone, push identifiers, wallet data, referral internals, notification settings, moderation fields, AI-review fields, or admin-only fields were returned.

## Matched-Profile RPC Tests

`get_matched_profile(p_profile_id uuid)` passed runtime verification.

| Test | Result |
| --- | --- |
| Valid matched user returns approved fields only | Passed, `200`, 1 row |
| Anonymous caller rejected | Passed, `401` |
| Non-matched caller receives no row | Passed, `200`, 0 rows |
| Blocked/reported access receives no row | Passed, `200`, 0 rows |
| Invalid UUID fails safely | Passed, `400` |
| Caller-supplied identity override rejected | Passed, `404` |

Returned keys observed:

`age`, `anthem`, `attraction_goal`, `avatar_url`, `bio`, `completion_score`, `department`, `faculty`, `full_name`, `gender`, `id`, `interests`, `intro_prompt`, `is_live`, `is_verified`, `last_active`, `last_seen_at`, `level`, `photos`, `profile_photos`, `university`, `username`, `voice_intro_url`.

## Referral Tests

| Test | Result |
| --- | --- |
| Anonymous `validate_referral_code` for valid code | Passed, `200`, intentional |
| Invalid referral code fails safely | Passed, `200`, reason `not_found` |
| `apply_referral_code` requires auth | Passed, `401` |
| Self-referral denied | Passed, `200`, reason `self_referral` |
| Authenticated referral application succeeds | Passed, `200`, reason `applied` |
| Duplicate referral application prevented/idempotent | Passed, `200`, reason `already_applied` |
| Direct referral row manipulation denied | Passed, `403` |

## Confessions Tests

| Test | Result |
| --- | --- |
| Feed exposes no author identity fields | Passed, `200`, 2 rows |
| Anonymous feed rejected | Passed, `401` |
| Authenticated reaction toggle works for current user | Passed, `200`, toggled `true` |
| Raw confession reaction IDs are not readable | Passed, `403` |
| Forged another-user reaction row denied | Passed, `403` |

Returned feed keys observed:

`comment_count`, `content`, `created_at`, `id`, `is_viral`, `reaction_counts`, `total_reactions`, `university`, `user_reactions`.

Note: the current staging check constraint for confession reaction emoji appears to contain mojibake values. The runtime test used a database-accepted marker. This is a staging data hygiene issue to clean up before a confessions feature phase, not a profile RLS blocker.

## Leaderboard Tests

| Test | Result |
| --- | --- |
| Leaderboard returns approved public fields only | Passed, `200`, 25 rows |
| Anonymous leaderboard access rejected | Passed, `401` |

Returned keys observed:

`avatar_url`, `full_name`, `gender`, `metric`, `profile_id`, `rank`, `score`, `university`.

No email, phone, wallet details, referral internals, Premium internals, moderation fields, or push identifiers were returned.

## Auth Flow Tests

| Flow | Result |
| --- | --- |
| Login for all 13 confirmed test users | Passed |
| Invalid email login | Passed, `400` |
| Incorrect credential handling | Passed, `400` |
| Refresh-token session refresh | Passed, `200` |
| Refreshed session can read owner profile | Passed, `200` |
| Logout endpoint | Passed, `204` |
| Refresh token after logout | Passed, `400` |
| Invalid/revoked session handling | Passed, `401` |
| Password-reset request | Safely blocked/rate-limited, `429`; no email delivery claimed |
| Network-error path | Passed, client-side `network_error` signal |
| Incomplete-profile routing data | Passed by owner C `is_onboarded=false` state |
| Completed-profile routing data | Passed by completed owners `is_onboarded=true` state |

Signup through public Auth was not used for the final run because staging email confirmation is not automatic and rate limiting was active. Registration behavior was covered by administratively confirmed disposable users plus login/session/logout/profile-state checks. A separate SMTP-backed staging signup test is still recommended before end-user beta testing.

## Fixture Helper Status

| Check | Result |
| --- | --- |
| Helper slug | `codex-staging-final-rls-fixture` |
| Final deployed version | 5 |
| Final behavior | Inert `410` response |
| JWT verification | Enabled |
| Unauthenticated access | Rejected with `401` |
| Service-role key exposed to client/repo | No |

## Verdict

The final staging Auth and RLS runtime matrix passed. Native Android Phase 2 may begin against staging for auth, onboarding/profile-state routing, discovery-card contracts, matched-profile contracts, referral validation/application, leaderboard display, and confessions feed contracts.

Production promotion is not automatic. The profile RLS migration is now a production candidate, but production application still requires explicit owner approval, a fresh production read-only preflight, and acceptance or remediation of the advisor and Auth trigger caveats documented in the approval checklist.
