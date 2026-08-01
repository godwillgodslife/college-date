# Native Profile Data Contract

Date: 2026-08-01

Status: proposed contract after anonymous profile exposure remediation. Do not implement Phase 2 screens until the proposed migration is reviewed and applied in staging, live RLS is verified, and the product-owner decisions are closed.

Important: this is the target native contract, not what the first-stage remediation fully enforces. The first-stage migration blocks anonymous reads but intentionally preserves a transitional authenticated `profiles` read policy for current web compatibility. Owner-only direct `profiles` reads remain a required follow-up before native profile/discovery Phase 2.

## Current User Profile

- Source: `public.profiles`
- Authentication: authenticated owner only
- Request parameters: current `auth.uid()` only; client must not pass another user id as authoritative
- Response fields: `id`, `full_name`, `username`, `email`, `avatar_url`, `profile_photos`, `age`, `gender`, `role`, `university`, `department`, `faculty`, `level`, `bio`, `interests`, `attraction_goal`, `is_onboarded`, owner notification settings, owner quota fields needed for UI
- Pagination: none
- Cache suitability: yes, encrypted/session-scoped or Room with logout/account-deletion purge
- Realtime suitability: owner row only, avoid full-row public discovery subscriptions
- Error cases: no session, RLS denied, missing profile, schema mismatch
- RLS expectation: direct `profiles` select returns only `id = auth.uid()`

Note: native Phase 1 currently selects `name`, but live-safe probing found `full_name`, not `name`. Native should use `full_name` for the production profile contract.

## Onboarding

- Source: `public.profiles` plus `profile-photos` storage bucket
- Authentication: authenticated owner only
- Request parameters: current user id from session, onboarding field payload, owner photo path
- Response fields: updated owner profile summary and `is_onboarded`
- Pagination: none
- Cache suitability: owner profile cache only after successful write
- Realtime suitability: not required
- Error cases: under-age validation failure, missing required fields, storage upload failure, RLS denied, network timeout
- RLS expectation: insert/update allowed only when `profiles.id = auth.uid()`

Current web completion fields are `full_name`, `age`, `university`, `level`, `interests`, `attraction_goal`, `profile_photos`, `avatar_url`, and `is_onboarded`.

## Discovery Cards

- Source: existing `public.discovery_feed_v3` only after it is authenticated-only and field-reviewed, or a new reviewed RPC such as `get_discovery_profiles`
- Authentication: authenticated user only
- Request parameters: filter options, pagination cursor/limit; never caller-supplied user id as authority
- Response fields: `id`, display name, `username`, `avatar_url`, `profile_photos`, `age`, `gender`, `university`, `department`, `faculty`, `level`, `bio`, `interests`, `attraction_goal`, display badges, verified/trust status, privacy-respecting presence label
- Pagination: required, limit/cursor or limit/offset
- Cache suitability: yes, short TTL, remove on logout/account deletion
- Realtime suitability: only safe summary updates, not full profile row payloads
- Error cases: unauthenticated, profile incomplete, RLS denied, no candidates, network unavailable
- RLS expectation: anonymous returns no rows; authenticated receives only eligible safe fields

## Viewing a Matched Profile

- Source: future matched-profile summary RPC/view, or `matches` participant-scoped query with safe nested profile fields
- Authentication: authenticated match participant only
- Request parameters: matched profile id or match id
- Response fields: discovery-safe fields plus match-only fields approved by product owner, such as exact last-seen if allowed
- Pagination: none
- Cache suitability: yes, short TTL
- Realtime suitability: safe summary/presence updates only
- Error cases: not matched, blocked, RLS denied, profile unavailable
- RLS expectation: non-participants cannot read matched-only fields

## Editing the Owner Profile

- Source: `public.profiles`
- Authentication: authenticated owner only
- Request parameters: editable owner field allowlist
- Response fields: updated owner profile
- Pagination: none
- Cache suitability: yes, update owner cache after success
- Realtime suitability: owner profile state only
- Error cases: validation failure, RLS denied, storage failure, schema mismatch
- RLS expectation: update allowed only for `id = auth.uid()`, with server-side restrictions for administrative/economy fields

## Profile Completion

- Source: `public.profiles`; future server-side helper recommended
- Authentication: authenticated owner only
- Request parameters: owner profile fields
- Response fields: completion status and missing required fields
- Pagination: none
- Cache suitability: yes
- Realtime suitability: not required
- Error cases: missing adult eligibility, missing campus, missing photo, RLS denied
- RLS expectation: `is_onboarded` is owner-only and must not be anonymous-readable

## Blocking

- Source: existing/future block table or RPC, not direct profile mutation
- Authentication: authenticated user only
- Request parameters: target profile id and reason/category if required
- Response fields: success and updated visibility state
- Pagination: for block list only
- Cache suitability: yes for local exclusions
- Realtime suitability: not required
- Error cases: target missing, duplicate block, RLS denied
- RLS expectation: caller can create/manage only their own block relationships

## Reporting

- Source: moderation/report RPC or report table with RLS
- Authentication: authenticated user only
- Request parameters: target profile/content id, reason, optional details
- Response fields: success and report id/status
- Pagination: none for normal users
- Cache suitability: no, except local pending-write retry metadata
- Realtime suitability: not required
- Error cases: duplicate/abusive report, target missing, RLS denied
- RLS expectation: user can create own reports but cannot read admin moderation data

## Premium Visibility

- Source: owner `profiles`/`subscriptions`/entitlements for own status; safe badge field for discovery if product approves
- Authentication: authenticated user only
- Request parameters: current session
- Response fields: for owner: premium active boolean and expiry; for discovery: badge boolean only
- Pagination: none
- Cache suitability: owner status short TTL; discovery badge with card cache
- Realtime suitability: not required for Phase 2
- Error cases: entitlement unavailable, stale subscription, RLS denied
- RLS expectation: `premium_expires_at` is owner-only; broad clients get only approved badge state

## Online or Last-Seen Visibility

- Source: presence RPC/view or safe profile summary field
- Authentication: authenticated user only
- Request parameters: none beyond current session/filter context
- Response fields: privacy-respecting label such as online/recently active, not raw timestamps by default
- Pagination: follows discovery/match surface
- Cache suitability: very short TTL only
- Realtime suitability: yes, but only for safe presence state
- Error cases: hidden presence, blocked user, RLS denied
- RLS expectation: exact `last_seen`, `last_seen_at`, and `last_active` are match-only or owner-only unless product owner approves broader exposure

## Leaderboard

- Source: reviewed authenticated RPC or reduced authenticated view, not anonymous `leaderboard_unified`
- Authentication: authenticated user only
- Request parameters: category and limit
- Response fields: `rank`, `profile_id`, `display_name`, `avatar_url`, `university`, `category`, `display_score`, `is_current_user`
- Pagination: limit/cursor or limit/offset
- Cache suitability: yes, short TTL
- Realtime suitability: not required for initial native implementation
- Error cases: unauthenticated, RLS denied, empty leaderboard
- RLS expectation: anonymous returns no rows; exact spend/payment-derived fields are not exposed unless explicitly approved

## Confessions

- Source: future anonymous-safe/authenticated-safe confession feed RPC or view
- Authentication: authenticated user only unless product owner approves a separate public preview with no identity fields
- Request parameters: university filter, limit, cursor
- Response fields: `id`, `content`, `university`, coarse created timestamp, `total_reactions`, `comment_count`, `is_viral`, current user's own reaction/claim state
- Pagination: required
- Cache suitability: short TTL for feed; never cache poster identity because it should not be returned
- Realtime suitability: count updates only, no identity payloads
- Error cases: unauthenticated, moderated content hidden, RLS denied, empty feed
- RLS expectation: clients cannot read poster id, reactor ids, claimer ids, or poster notification preferences

## Referral Validation

- Source: `validate_referral_code(p_code text)`
- Authentication: anonymous and authenticated may call validation; applying a code requires authenticated user
- Request parameters: normalized referral code only
- Response fields: `valid`, `code`, `reason`, optional display-safe referrer name/handle
- Pagination: none
- Cache suitability: no durable cache; short in-memory form state only
- Realtime suitability: not required
- Error cases: empty code, not found, inactive, self-referral after auth, already applied
- RLS expectation: RPC must not expose direct profile rows, email, wallet/reward state, or referrer private identifiers
