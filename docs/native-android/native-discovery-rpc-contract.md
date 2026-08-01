# Native Discovery RPC Contract

Date: 2026-08-01

Preferred native endpoint:

```sql
public.get_discovery_profiles(
  p_limit integer default 40,
  p_offset integer default 0,
  p_filters jsonb default '{}'::jsonb
)
```

This RPC replaces broad native reads from `public.profiles` or `public.discovery_feed_v3` for the first staging discovery pass.

## Caller

- Role: `authenticated`
- Identity source: `(select auth.uid())`
- The caller does not provide their own user id.
- The caller must have a profile.
- The caller profile must be onboarded.
- Banned or shadow-banned callers are rejected.

## Inputs

| Parameter | Type | Required | Rules |
|---|---|---:|---|
| `p_limit` | integer | No | Clamped to `1..50`; default `40` |
| `p_offset` | integer | No | Minimum `0`; default `0` |
| `p_filters` | jsonb | No | Optional `university`, `gender`, `live_only` |

Example:

```json
{
  "university": "University of Lagos",
  "gender": "female",
  "live_only": true
}
```

## Returned Fields

| Field | Purpose |
|---|---|
| `id` | Profile-card identity |
| `full_name` | Display name |
| `username` | Optional display handle |
| `gender` | Discovery/preference UI |
| `age` | Adult dating profile card |
| `university` | Campus context |
| `faculty`, `department`, `level` | Campus profile context |
| `bio` | Profile card copy |
| `avatar_url`, `photos`, `profile_photos` | Profile card media |
| `interests` | Chips/interests |
| `intro_prompt`, `voice_intro_url`, `anthem`, `attraction_goal` | Safe profile-card enrichment |
| `is_verified` | Trust badge |
| `completion_score` | Sorting/scoring signal |
| `last_seen_at`, `last_active` | Presence freshness |
| `is_live` | Derived recent-presence boolean |
| `is_boosted` | Boolean boost ranking signal only |
| `seen_count` | Current caller's impression count |

## Explicitly Not Returned

- `email`
- `phone`
- `push_token`
- `onesignal_id`
- referral code or referral attribution
- wallet balances or wallet transaction data
- subscription rows or Premium expiry internals
- notification preferences
- moderation flags such as ban/shadow-ban fields
- AI review status, scores, summaries or flags
- admin/internal fields
- reaction, claim, report or private relationship records

## Server-Side Filters

The function enforces:

- caller authentication
- caller profile exists
- caller is onboarded
- caller is not banned or shadow-banned
- candidate is not caller
- candidate is onboarded
- candidate is not banned, shadow-banned, blocked, or incognito
- caller interest gender preference
- candidate interest gender preference
- optional campus filter
- optional gender filter
- optional live-only filter using recent `last_active`/`last_seen_at`
- prior swipe exclusion
- existing match exclusion
- report-based exclusion as a staging fallback for missing block-table evidence
- limit/offset pagination

## Blocking/Reporting Note

No dedicated production `blocks` table was confirmed in the baseline table inventory. Until a real block-table contract is confirmed, the staging RPC excludes profiles where either side has an active non-dismissed row in `public.reports`. This is a conservative fallback, not a final blocking model.

## Sorting

Ordering is server-side:

1. Active boost signal.
2. Same university as caller.
3. Completion score.
4. Recent `last_active`, `last_seen_at`, or `created_at`.
5. Stable profile id tie-breaker.

## RLS Relationship

The function is `SECURITY DEFINER` because direct profile RLS should remain own-row only. The function compensates by:

- never accepting a caller user id
- reading caller identity from `auth.uid()`
- projecting only approved card fields
- excluding sensitive fields
- granting execution only to `authenticated`
- revoking default `PUBLIC` execution
- setting `search_path` to `''`
- schema-qualifying all referenced tables and functions

## Required Native Client Behavior

- Treat the RPC as the only discovery profile source.
- Never query `profiles.select('*')` for discovery.
- Cache only returned card fields.
- On `onboarding_required`, route to onboarding.
- On `profile_not_allowed`, sign out or show account-status screen.
- On network failure, show cached cards only if already fetched and mark data stale.

## Test Matrix

| Scenario | Expected result |
|---|---|
| Unauthenticated caller | RPC rejected |
| Missing profile | `profile_missing` error |
| Incomplete onboarding | `onboarding_required` error |
| Banned caller | `profile_not_allowed` error |
| Candidate previously swiped | Candidate excluded |
| Candidate already matched | Candidate excluded |
| Candidate has private fields | Private fields not returned |
| Campus filter | Only matching campus rows |
| Gender preference | Caller and candidate preferences enforced |
| `live_only=true` | Only recent active candidates |
| Large limit | Limit clamped to 50 |
