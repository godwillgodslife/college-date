# Staging Auth Runtime Test Results

Date: 2026-08-01

Project: `College Date Staging` / `pxobauvatbjncluuunyq`

## Summary

True Auth-session runtime tests are blocked because disposable confirmed staging users could not be created in this pass.

The staging API is reachable. The blocker is Auth email validation/rate limiting, not database availability.

## Disposable User Creation

| Required user | Result |
| --- | --- |
| Owner A | Blocked |
| Owner B | Blocked |
| Non-owner | Blocked |
| Incomplete profile | Blocked |
| Completed profile | Blocked |
| Discovery candidate | Blocked |
| Blocked pair | Blocked |
| Referral test pair | Blocked |
| Confession author | Blocked |
| Leaderboard participant | Blocked |

Reason:

- public signup with `.test` or `example.com` synthetic domains fails validation;
- public signup with a synthetic app-domain address hit `over_email_send_rate_limit`;
- no Auth admin creation tool is available in the connected Supabase MCP;
- direct SQL insertion into `auth.users` is disallowed and was not used.

## Anonymous Runtime Tests

These tests used the public staging publishable key and did not select or print profile rows.

| Test | Result |
| --- | --- |
| Anonymous direct `profiles` read | Passed, `401` |
| Anonymous direct `discovery_feed_v3` read | Passed, `401` |
| Anonymous direct `leaderboard_unified` read | Passed, `401` |
| Anonymous direct `optimized_confessions` read | Passed, `401` |
| Anonymous `get_discovery_profiles` call | Passed, `401` |
| Anonymous `get_matched_profile` call | Passed, `401` |
| Anonymous `get_leaderboard_profiles` call | Passed, `401` |
| Anonymous `get_confession_feed` call | Passed, `401` |
| Anonymous `validate_referral_code` call | Passed, `200` |

## Owner Runtime Tests

| Test | Result |
| --- | --- |
| Read own profile | Blocked |
| Update permitted own fields | Blocked |
| Attempt protected own-field update | Blocked |
| Complete onboarding | Blocked |
| Own profile loading | Blocked |
| Profile editing | Blocked |

## Non-Owner Runtime Tests

| Test | Result |
| --- | --- |
| Direct read another full profile | Blocked |
| Update another profile | Blocked |
| Retrieve hidden/private fields | Blocked |
| Access matched profile without match | Blocked |
| Access matched profile with match | Blocked |

## Discovery Runtime Tests

| Test | Result |
| --- | --- |
| Authenticated discovery returns only approved fields | Blocked |
| Prior swipes excluded | Blocked |
| Blocked/reported users excluded | Blocked |
| Pagination enforced | Blocked |
| Anonymous call rejected | Passed |

## Smoke Tests

| Flow | Result |
| --- | --- |
| Registration | Blocked by Auth email validation/rate limit |
| Login | Blocked by unavailable confirmed users |
| Password reset | Not configured/tested; email rate limit active |
| Onboarding | Blocked |
| Own-profile loading | Blocked |
| Profile editing | Blocked |
| Discovery | Anonymous denial passed; authenticated flow blocked |
| Standard swipe | Blocked |
| Match creation | Blocked |
| Leaderboard | Anonymous denial passed; authenticated flow blocked |
| Confessions | Anonymous denial passed; authenticated flow blocked |
| Referral validation | Passed anonymously |

## Required Next Step

Use the Supabase dashboard or a reviewed temporary server-side admin path to create disposable confirmed users. Do not share service-role keys and do not insert directly into `auth.users`.
