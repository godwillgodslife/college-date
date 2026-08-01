# Native Matched Profile Contract

Date: 2026-08-01

Preferred native endpoint:

```sql
public.get_matched_profile(p_profile_id uuid)
```

This RPC is the only approved native way to read another user's profile after a match during the authenticated-profile isolation phase.

## Caller

- Role: `authenticated`
- Identity source: `auth.uid()`
- The caller cannot provide or override their own user id.
- Anonymous callers are rejected.

## Access Rule

The function returns a row only when:

- `p_profile_id` is not null;
- `p_profile_id` is not the caller;
- a `public.matches` row exists whose `user_ids` array contains both the caller and `p_profile_id`;
- the target profile is not banned;
- the target profile is not shadow-banned;
- the target profile is not blocked;
- the target profile is not incognito;
- no active non-dismissed `public.reports` row exists between the caller and target in either direction.

No matched row means no profile output.

## Returned Fields

| Field | Purpose |
| --- | --- |
| `id` | Matched profile identity |
| `full_name` | Display name |
| `username` | Optional handle |
| `gender` | Profile context |
| `age` | Adult dating profile context |
| `university` | Campus context |
| `faculty`, `department`, `level` | Campus profile context |
| `bio` | Profile text |
| `avatar_url`, `photos`, `profile_photos` | Profile media |
| `interests` | Interest chips |
| `intro_prompt`, `voice_intro_url`, `anthem`, `attraction_goal` | Profile enrichment |
| `is_verified` | Trust badge |
| `completion_score` | Profile completeness signal |
| `last_seen_at`, `last_active` | Presence freshness |
| `is_live` | Derived recent-presence boolean |

## Explicitly Not Returned

- `email`
- `phone`
- `push_token`
- `onesignal_id`
- wallet balances or wallet transactions
- referral code or referral attribution
- notification preferences
- Premium expiry internals
- moderation flags
- AI verification/review fields
- admin/internal fields
- report, claim, reaction, or private relationship records

## RLS Relationship

Direct `public.profiles` reads are owner-only. The matched-profile RPC is `SECURITY DEFINER` because it must safely read another profile after verifying the match relationship. It compensates by:

- validating `auth.uid()`;
- requiring a real match;
- excluding report-based blocked pairs;
- projecting only approved display fields;
- revoking default `PUBLIC` execution;
- granting execution only to `authenticated`;
- setting `search_path` to `''`;
- schema-qualifying referenced tables.

## Native Client Rules

- Do not query `profiles.select('*')` for another user.
- Do not read `discovery_feed_v3` directly.
- Use `get_discovery_profiles(...)` for discovery cards.
- Use `get_matched_profile(uuid)` for matched-user detail surfaces.
- Treat empty results as "not allowed or not found".
- Do not cache private profile fields from other users.
