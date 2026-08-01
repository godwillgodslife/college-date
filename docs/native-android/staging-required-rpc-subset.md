# Staging Required RPC Subset

Date: 2026-08-01

SQL package: `supabase/baseline/035_required_functions_hardened.sql`

This subset is intentionally limited to the first staging backend scope. It does not implement Paystack, RevenueCat, wallet settlement, Premium entitlements, push delivery, calls, admin operations, scheduled jobs, full messaging, profile viewers, or admirers.

## Approved Functions

| Function signature | Purpose | Calling feature | Privileges | Inputs | Output | Tables touched | RLS relationship | Safe caller roles | Definer reason | Search path | Test cases | Known limitations |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `normalize_referral_code(text)` | Normalize referral input | Internal helper | No client grant | raw code | normalized code | none | N/A | none | Not definer | `''` | blank, lowercase, punctuation | Internal helper only |
| `generate_referral_code()` | Generate random code | Internal helper | No client grant | none | text | none | N/A | none | Not definer | `''` | prefix, length, charset | Collision not checked here |
| `generate_unique_referral_code()` | Generate collision-checked code | Profile trigger | No client grant | none | text | `profiles` | Bypasses RLS internally | trigger/internal only | Needs cross-profile collision check | `''` | collision retry, max attempts | Uses random generation, not sequential |
| `handle_new_profile_referral()` | Ensure profile has referral code | Profile creation trigger | No client grant | trigger row | trigger row | `profiles` | Trigger-only | trigger/internal only | Trigger must set protected field | `''` | missing code, supplied code normalization | Does not award referral rewards |
| `sync_referral_from_profile()` | Create referral attribution row | Profile referral trigger | No client grant | trigger row | trigger row | `profiles`, `referrals` | Trigger-only | trigger/internal only | Needs cross-table insert | `''` | first referral, duplicate referral, self referral | No rewards or wallet side effects |
| `handle_new_user()` | Create baseline profile and local support rows after auth signup | Auth trigger | No client grant | `auth.users` trigger row | trigger row | `profiles`, `user_settings`, `swipe_limits`, `engagement_scores` | Trigger bypasses profile RLS | trigger/internal only | Auth trigger must create public profile | `''` | email signup, OAuth signup, metadata referral code, bad metadata UUID | Does not create wallet/subscription rows |
| `validate_referral_code(text)` | Public referral-code validation | Signup/referral | `anon`, `authenticated` | code | JSON validity and display-safe referrer name | `profiles` | Bypasses direct profile RLS safely | anon/authenticated | Anonymous users cannot read profiles directly | `''` | empty, not found, banned referrer, valid | Does not return referrer UUID |
| `apply_referral_code(text)` | Apply referral to current user | Signup/OAuth after auth | `authenticated` | code | JSON success/already-applied | `profiles`, `referrals` | Bypasses direct profile/referral writes with auth guard | authenticated | Needs to find referrer and write referral row | `''` | unauthenticated, missing profile, self referral, duplicate, valid | No money/free-swipe rewards |
| `calculate_completion_score()` | Maintain profile completion score | Profile insert/update trigger | No client grant | trigger row | trigger row | `profiles` row | Invoker trigger | trigger/internal only | Not definer | `''` | required fields, photos, interests | Heuristic only |
| `update_photo_timestamp()` | Maintain profile photo update timestamp | Profile update trigger | No client grant | trigger row | trigger row | `profiles` row | Invoker trigger | trigger/internal only | Not definer | `''` | avatar change, photos change, no photo change | No storage validation |
| `get_current_profile()` | Retrieve current user's profile subset | Native profile/onboarding | `authenticated` | none | table row | `profiles` | Uses own-row RLS and grants | authenticated | Not definer | `''` | no session, missing profile, own profile | Does not expose push tokens, moderation, wallet, AI review fields |
| `update_current_profile(jsonb)` | Update whitelisted current-user profile fields | Native onboarding/profile edit | `authenticated` | whitelisted JSON fields | updated profile row | `profiles` | Uses own-row RLS and grants | authenticated | Not definer | `''` | invalid age, under 18, invalid gender, complete onboarding, partial update | Does not update email/admin/payment/push fields |
| `update_user_presence()` | Update current user's presence timestamps | Presence foundation | `authenticated` | none | void | `profiles` | Uses own-row RLS and grants | authenticated | Not definer | `''` | no session, own session | No offline/away expiry job |
| `check_and_reset_swipe_limit(uuid)` | Read/reset daily swipe quota | Native swipe flow | `authenticated` | current user's UUID | JSON quota state | `profiles`, `subscriptions`, `swipe_limits` | Definer with self check | authenticated | Needs quota row mutation and subscription read | `''` | other user id rejected, reset after 24h, premium active, missing profile | Uses staging 20/day rule; no wallet/free-swipes economy |
| `get_discovery_profiles(integer, integer, jsonb)` | Safe profile-card discovery | Native discovery | `authenticated` | limit, offset, filters | profile-card rows only | `profiles`, `swipes`, `matches`, `reports`, `feed_impressions`, `boosts` | Definer with `auth.uid()` and safe return projection | authenticated | Must read other users without broad profile RLS | `''` | no session, not onboarded, prior swipes, existing matches, reports, campus/gender/live filters | No block table exists in baseline; reports are used as fallback exclusion |
| `record_feed_impression(text, uuid, text, boolean)` | Track profile/confession impressions | Discovery/confession feed | `authenticated` | entity type/id/source/engaged | JSON success | `feed_impressions` | Definer with `auth.uid()` | authenticated | Keeps direct feed table closed | `''` | invalid entity, insert, update duplicate, engaged timestamp | Does not validate entity ownership |
| `record_profile_swipe(uuid, text, text, text, text)` | Record standard pass/like and create match on mutual like | Native swipe/match | `authenticated` | target id, direction, swipe type, optional teaser/op id | JSON swipe/match result | `profiles`, `swipes`, `matches`, `swipe_limits`, `engagement_scores`, `feed_impressions` | Definer with `auth.uid()`, target eligibility and quota checks | authenticated | Needs atomic cross-row write while direct profile reads remain closed | `''` | unauthenticated, self target, unavailable target, invalid direction, deferred premium type, daily limit, mutual like | Standard-only; no wallet, payment, Super Swipe or notifications |
| `accept_swipe_request(uuid)` | Accept incoming pending right-swipe and create match | Requests/matches | `authenticated` | swipe id | JSON match result | `swipes`, `matches` | Definer with recipient check | authenticated | Needs to update incoming swipe and insert match | `''` | non-recipient rejected, missing swipe, duplicate match | No wallet reward or notification side effect |
| `get_leaderboard_profiles(text, integer)` | Safe leaderboard rows | Native leaderboard | `authenticated` | kind, limit | rank/profile/score rows | `profiles`, `swipes`, `profile_views`, `matches`, `engagement_scores` | Definer with safe projection | authenticated | Needs cross-profile aggregates without broad profile RLS | `''` | most wanted, campus stars, active, invalid kind, limit clamp | No wallet spend leaderboard in this phase |
| `get_confession_feed(text, integer, integer)` | Safe confession feed | Native confessions | `authenticated` | university, limit, offset | confession rows without author/reaction identities | `confessions`, `confession_reactions`, `confession_comments` | Definer with safe projection | authenticated | Avoids `optimized_confessions` identity leakage | `''` | university filter, pagination, user reactions | Does not expose claim ids or poster ids |
| `toggle_confession_reaction(uuid, text)` | Toggle current user's reaction | Native confessions | `authenticated` | confession id, emoji | JSON toggle result | `confessions`, `confession_reactions`, `feed_impressions` | Definer with `auth.uid()` | authenticated | Keeps direct reaction table closed | `''` | no session, missing confession, duplicate toggle, invalid emoji | No notification side effect |

## Trigger Decisions

| Trigger | Table | Decision | Feature impact |
|---|---|---|---|
| `on_auth_user_created` | `auth.users` | Preserve with hardened `handle_new_user()` | Signup creates profile/support rows |
| `on_profile_created_referral` | `public.profiles` | Preserve with hardened `handle_new_profile_referral()` | Referral code is generated |
| `tr_sync_referral` | `public.profiles` | Preserve with hardened `sync_referral_from_profile()` | Referral attribution row created |
| `track_photo_update` | `public.profiles` | Preserve with hardened `update_photo_timestamp()` | Discovery freshness supported |
| `calculate_profile_completion` | `public.profiles` | Add staging trigger with invoker function | Onboarding completion score updates |
| `confession_notification_trigger` | `public.confessions` | Defer | Push/email notification not in scope |
| `premium_swipe_auto_match` | `public.swipes` | Defer | Premium/Super Swipe not in scope |
| `swipe_notification_trigger` | `public.swipes` | Defer | Push notification not in scope |
| `on_new_referral`, `tr_on_new_referral` | `public.referrals` | Defer | Wallet/free-swipe referral rewards not in scope |
| `on_wallet_transaction_created` | `public.wallet_transactions` | Defer | Wallet settlement not in scope |
| message/profile-view notification triggers | `messages`, `profile_views` | Defer | Messaging/viewer notifications not in scope |

## Required Verification Before Applying to Staging

1. Apply baseline to a disposable staging database transaction or fresh staging project.
2. Run `select public.validate_referral_code('missing');`.
3. Create two approved test users in staging only and confirm `auth.users` trigger creates profiles.
4. Confirm `anon` can execute only `validate_referral_code`.
5. Confirm `authenticated` can execute approved RPCs and cannot execute trigger/helper functions.
6. Confirm `get_discovery_profiles` does not return email, phone, tokens, referral details, wallet, AI review or moderation fields.
7. Confirm standard mutual swipes create one match idempotently.
8. Run Supabase security and performance advisors against staging.
