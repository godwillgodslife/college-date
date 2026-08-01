# Privileged Function Inventory

Date: 2026-08-01

Projects inspected:
- Production: `College Date` (`gedoyoleoscgxgdqszzc`)
- Staging target: `College Date Staging` (`pxobauvatbjncluuunyq`)

Scope: read-only metadata inspection of production PostgreSQL functions, triggers, grants, advisors, local migrations, and app-side RPC calls. No user records were selected and no remote writes were executed.

## Evidence

- Production metadata query over `pg_proc`, `pg_namespace`, `pg_language`, and `information_schema.routine_privileges`.
- Production trigger metadata query over `pg_trigger`, `pg_class`, and `pg_proc`.
- Supabase security and performance advisors for production.
- App RPC usage scan across `src/` and `android-native/`.
- Local migrations under `supabase/migrations/`.
- Baseline files under `supabase/baseline/`.

## Production Summary

| Finding | Result |
|---|---:|
| Public functions inspected | 104 |
| `SECURITY DEFINER` functions | 100 |
| `SECURITY INVOKER` functions | 4 |
| Mutable `search_path` functions | 1: `public.process_referral_rewards()` |
| Public/authenticated trigger dependencies | 12 production triggers, including `auth.users -> public.handle_new_user()` |
| Advisor security-definer view warning | `public.leaderboard_unified` |
| Advisor anon-callable definer warnings | Present |
| Advisor authenticated-callable definer warnings | Present |

## App-Called RPCs

| RPC | App location | Classification | Risk |
|---|---|---|---|
| `check_and_reset_swipe_limit` | `src/services/swipeService.js` | Required for discovery/swiping | High |
| `process_swipe_payment` | `src/services/swipeService.js` | Deferred payment/wallet mutation | Critical |
| `accept_swipe_request` | `src/services/swipeService.js` | Required for swipe/match, hardened without wallet reward | High |
| `send_super_swipe` | `src/services/swipeService.js` | Deferred boost/wallet/premium feature | High |
| `record_feed_impression` | `src/services/feedImpressionService.js` | Required for safe discovery/feed state | Medium |
| `validate_referral_code` | `src/services/referralService.js` | Required for referral-code validation | Medium |
| `apply_referral_code` | `src/services/referralService.js` | Required for referral attribution | Medium |
| `update_user_presence` | `src/services/profileService.js` | Required for presence foundation | Low |
| `get_admirers_secure` | `src/pages/Requests.jsx`, `src/pages/Chat.jsx` | Deferred premium/request surface | High |
| `get_profile_viewers_secure` | `src/pages/Viewers.jsx`, `src/pages/Chat.jsx` | Deferred premium/viewer surface | High |
| `update_match_disappearing_messages` | `src/services/chatService.js` | Deferred messaging | Medium |
| `insert_notification` | `src/services/notificationService.js` | Deferred notifications | High |
| `register_notification_device` | `src/services/pushNotification.js` | Deferred push | High |
| `revoke_notification_device` | `src/services/pushNotification.js` | Deferred push | High |
| `purchase_premium_with_wallet` | `src/services/paymentService.js` | Deferred wallet/Premium | Critical |
| `request_wallet_withdrawal` | `src/services/paymentService.js` | Deferred wallet settlement | Critical |
| Admin RPCs | `src/pages/AdminDashboard.jsx` | Deferred admin | Critical |

## Candidate Function Review

| Function | Production metadata | Tables/views referenced | Called functions | Trigger/policy/app dependency | Caller identity handling | Caller-supplied user ID risk | Money/Premium/referral/moderation | Classification | Risk | Staging decision |
|---|---|---|---|---|---|---|---|---|---|---|
| `handle_new_user()` | `plpgsql`, volatile, definer, owner `postgres`, `search_path=public, extensions`, no client grant | `auth.users`, `profiles`, `user_settings`, `swipe_limits`, `engagement_scores`, production also `wallets`, `subscriptions` | none | Trigger: `auth.users` after insert | Uses trigger `NEW`; no client caller | No client-supplied user id | Reads signup metadata only; no authz decision | Required for profile creation | High | Rebuilt with fixed `search_path=''`, no wallet/subscription creation, no admin metadata trust |
| `handle_new_profile_referral()` | `plpgsql`, volatile, definer, `search_path=''`, no client grant | `profiles` | `generate_referral_code` in production | Trigger: `profiles` before insert | Trigger-only | No client-supplied user id | Referral code generation | Required for onboarding/referral | Medium | Rebuilt with normalized unique code generation |
| `sync_referral_from_profile()` | `plpgsql`, volatile, definer, `search_path=public, extensions`, no client grant | `profiles`, `referrals` | none | Trigger: `profiles` after insert/update of `referred_by` | Trigger-only | `referred_by` can come from profile write | Referral attribution, no reward | Required for referral attribution | Medium | Rebuilt idempotent, no wallet reward |
| `generate_referral_code()` | `plpgsql`, volatile, definer, `search_path=''`, authenticated grant | none | `random()` | Helper | No caller identity | None | Referral helper | Internal helper | Low | Rebuilt as invoker helper; no client grants |
| `generate_unique_referral_code()` | `plpgsql`, volatile, definer, `search_path=''`, authenticated grant | `profiles` | `generate_referral_code` | Helper | No caller identity | None | Referral helper | Internal helper | Medium | Rebuilt as definer, no client grants, max attempts |
| `validate_referral_code(text)` | Not found in production metadata; found in local migration `20260725130000_secure_referral_code_flow.sql` | `profiles` | `normalize_referral_code` | App signup/referral validation | No auth required | No user id input | Referral lookup | Required for referral validation | Medium | Added as safe public RPC; returns no referrer UUID |
| `apply_referral_code(text)` | Not found in production metadata; found in local migration `20260725130000_secure_referral_code_flow.sql` | `profiles`, `referrals` | `normalize_referral_code` | App signup/OAuth attribution | Uses `auth.uid()` | No user id input | Referral attribution only | Required for referral attribution | Medium | Added as auth-only RPC; no reward/wallet grant |
| `calculate_completion_score()` | `plpgsql`, volatile, invoker, `search_path=''`, PUBLIC/anon/auth grants | `profiles` row via trigger `NEW` | none | Profile completion trigger candidate | Trigger-only | No client-supplied user id | None | Required for onboarding state | Low | Rebuilt invoker; client grants revoked |
| `calculate_completion_score(uuid)` | `plpgsql`, volatile, definer, `search_path=''`, PUBLIC/anon/auth grants | `profiles` | none | No required native call | Does not validate `auth.uid()` | Trusts `p_user_id` | Could inspect other profiles | Unsafe/deferred | High | Excluded |
| `update_photo_timestamp()` | `plpgsql`, volatile, invoker, `search_path=public, extensions`, no client grant | `profiles` row via trigger | none | Profile photo timestamp trigger | Trigger-only | No client-supplied user id | None | Required for profile updates | Low | Rebuilt invoker, `search_path=''` |
| `get_current_profile()` | New staging RPC | `profiles` | `auth.uid()` | Native current-profile retrieval | Uses `auth.uid()` and RLS | No user id input | Returns own profile subset | Required for onboarding/profile | Low | Added as invoker |
| `update_current_profile(jsonb)` | New staging RPC replacing production `update_profile_data` overloads | `profiles` | `get_current_profile` | Native current-profile update | Uses `auth.uid()` and RLS | No user id input | Whitelisted own profile fields only | Required for onboarding/profile | Medium | Added as invoker with whitelist and adult-age guard |
| `update_profile_data(...)` | Two production definer overloads, authenticated grant, `search_path=public, extensions` | `profiles` | `auth.uid()` | Legacy/update profile RPC | Uses `auth.uid()` | No user id input | One overload updates email | Legacy/deferred | Medium | Excluded in favor of `update_current_profile` |
| `update_user_presence()` | `plpgsql`, volatile, definer, `search_path=''`, authenticated grant | `profiles` | `auth.uid()` | Presence heartbeat | Uses `auth.uid()` | No user id input | Presence only | Required foundation | Low | Rebuilt as invoker |
| `update_user_presence(uuid, boolean)` | `plpgsql`, volatile, definer, authenticated grant | `profiles`, `is_app_admin()` | `is_app_admin` | Compatibility/admin presence | Validates self or admin | Trusts user id but guards | Admin-adjacent | Deferred | Medium | Excluded |
| `get_discovery_profiles(integer, integer, jsonb)` | New staging RPC | `profiles`, `swipes`, `matches`, `reports`, `feed_impressions`, `boosts` | `auth.uid()` | Native discovery contract | Uses `auth.uid()` | No user id input | Excludes sensitive profile columns | Required for safe discovery | High | Added as narrow definer RPC |
| `record_feed_impression(text, uuid, text, boolean)` | `plpgsql`, volatile, definer, `search_path=public`, authenticated grant | `feed_impressions` | `auth.uid()` | Feed/discovery freshness | Uses `auth.uid()` | No user id input | No money | Required | Medium | Rebuilt definer with `search_path=''`, auth-only |
| `check_and_reset_swipe_limit(uuid)` | `plpgsql`, volatile, definer, `search_path=public, extensions`, authenticated grant | `profiles`, `subscriptions`, `swipe_limits` | none | Swipe quota | Production definition did not reject other `p_user_id` in inspected body | Trusts caller-supplied `p_user_id` | Premium entitlement read | Required for swipe quota | High | Rebuilt with `auth.uid() = p_user_id` |
| `record_profile_swipe(uuid, text, text, text, text)` | New staging RPC | `profiles`, `swipes`, `matches`, `swipe_limits`, `engagement_scores`, `feed_impressions` | `check_and_reset_swipe_limit`, `record_feed_impression` | Native standard swipe/match path | Uses `auth.uid()` | No caller user id | No payment/wallet; premium swipe type rejected | Required for swipe/match testing | High | Added as standard-only definer RPC |
| `accept_swipe_request(uuid)` | `plpgsql`, volatile, definer, `search_path=public, extensions`, authenticated grant | Production touches `swipes`, `matches`, `wallets`, `wallet_transactions`; calls `notify_internally` | `notify_internally` | Requests/accept match | Production filters `swiped_id = auth.uid()` | No user id input | Production pays wallet reward | Required but unsafe as-is | High | Rebuilt without wallet reward or notifications |
| `process_swipe_payment(...)` | SQL/plpgsql definer overloads, authenticated grants, `search_path=''` | `swipes`, `profiles`, `subscriptions`, `wallets`, `wallet_transactions`, `swipe_payment_operations` | `check_and_reset_swipe_limit` | Web paid swipe flow | Auth guard present in local inspected body | Uses `p_swiper_id` but checks self | Money/wallet | Deferred | Critical | Excluded |
| `send_super_swipe(uuid)` | `plpgsql`, volatile, definer, authenticated grant | `boosts`, `swipes` | `auth.uid()` | Super Swipe | Uses `auth.uid()` | No user id input | Boost/paid product | Deferred | High | Excluded |
| `auto_match_premium_swipes()` | Trigger definer, no client grant | `swipes`, `matches`, notifications | `notify_internally` | Premium swipe trigger | Trigger-only | Trigger row | Premium/notifications | Deferred | High | Excluded |
| `get_leaderboard_profiles(text, integer)` | New staging RPC | `profiles`, `swipes`, `profile_views`, `matches`, `engagement_scores` | `auth.uid()` | Native leaderboard read | Uses `auth.uid()` | No user id input | No wallet spend output | Required for safe leaderboard | Medium | Added as definer RPC |
| `leaderboard_unified` view | Production advisor reports security-definer view | `profiles`, `swipes`, `profile_views`, `matches`, `wallets` | none | Web leaderboard | View does not have caller identity | N/A | Includes `total_spent` | Requires redesign | High | Baseline view uses `security_invoker`; staging RPC avoids wallet spend |
| `get_confession_feed(text, integer, integer)` | New staging RPC | `confessions`, `confession_reactions`, `confession_comments` | `auth.uid()` | Native confession feed | Uses `auth.uid()` | No user id input | Hides `user_id`, reaction user ids, claim ids | Required | Medium | Added as definer RPC |
| `toggle_confession_reaction(uuid, text)` | New staging RPC | `confessions`, `confession_reactions`, `feed_impressions` | `record_feed_impression` | Native confession reaction | Uses `auth.uid()` | No user id input | No notifications | Required | Medium | Added as definer RPC |
| `optimized_confessions` view | Security invoker in baseline | `confessions`, `confession_reactions`, `confession_comments`, `confession_claims` | none | Web confession feed | View has no caller identity | N/A | Exposes reaction user ids and claim ids | Requires redesign | Medium | Existing view kept; native should prefer `get_confession_feed` |
| `notify_*`, `insert_notification`, `register_notification_device`, `revoke_notification_device` | Mostly definer; several anon/PUBLIC executable per advisors | Notifications, devices, edge calls, service settings | `net.http_post`, `notify_internally` | Push/notification flows | Mixed | Some caller supplied ids | Push tokens/notification forgery risk | Deferred/unsafe | High | Excluded |
| `admin_*`, `make_admin`, `is_app_admin` | Definer; many authenticated callable | Admin/auth tables, audit/config/user management | `is_app_admin`, admin helpers | Admin dashboard | Internal admin checks vary | Some target user ids | Admin/moderation/finance | Deferred | Critical | Excluded from staging subset |
| Wallet/payment/premium RPCs | Definer; some anon/PUBLIC executable per advisors | `wallets`, `wallet_transactions`, `subscriptions`, `entitlements`, payment audit tables | payment helpers | Payment/Premium/wallet | Mixed | Some user id/product inputs | Money/Premium | Deferred | Critical | Excluded |
| Messaging/calls/snapshots/status RPCs | Definer/invoker mixed | `messages`, `matches`, `snapshots`, `statuses`, status media | notification helpers | Deferred feature areas | Mixed | Mixed | Messaging/calls/media | Deferred | Medium | Excluded |

## Full Production Function Classification

All 104 public functions were inventoried. The staging subset deliberately selects only the rows documented above. The remaining functions fall into these groups:

| Group | Functions | Classification | Risk | Staging action |
|---|---|---|---|---|
| Admin operations | `admin_*`, `make_admin`, admin permission helpers | Deferred admin | Critical | Exclude |
| Payment/wallet/Premium | `process_verified_payment`, `purchase_premium_with_wallet`, `purchase_boost`, wallet increment/decrement/withdrawal, entitlement helpers | Deferred payment/wallet | Critical | Exclude |
| Referral rewards | `check_referral_milestones`, `process_referral_rewards`, `process_referral_milestones`, `process_pending_referral_funds`, `unlock_matured_rewards` | Deferred rewards | High | Exclude for first staging scope |
| Notifications/push | `notify_*`, `insert_notification`, `notify_internally`, device registration/revoke | Deferred notifications | High | Exclude |
| Messaging/calls/status/snapshots | message expiry/update helpers, hidden counts, snapshot/status notification triggers | Deferred later features | Medium | Exclude |
| Discovery/swiping selected | `check_and_reset_swipe_limit`, `accept_swipe_request`, `record_feed_impression`, new `record_profile_swipe`, new `get_discovery_profiles` | Required | High | Rebuild hardened |
| Profile/onboarding selected | `handle_new_user`, referral triggers, completion/photo triggers, new profile RPCs | Required | Medium/High | Rebuild hardened |
| Confession/leaderboard selected | new safe feed/reaction/leaderboard RPCs | Required | Medium | Add narrow RPCs |

## Advisor Findings Relevant to This Pass

- `leaderboard_unified` is reported as a security-definer view in production. Baseline `040_views.sql` already defines it with `security_invoker = true`; `035_required_functions_hardened.sql` adds `get_leaderboard_profiles` to avoid wallet-spend exposure.
- `process_referral_rewards()` has mutable `search_path` in production. It is excluded because it grants wallet rewards.
- Several `SECURITY DEFINER` functions are executable by `anon` or `PUBLIC`, including viewer/admirer, entitlement, notification, wallet withdrawal, Premium purchase, and device functions. They are excluded from this staging subset.
- Performance advisors still report RLS init-plan and duplicate-policy issues in production. The staging baseline should continue using `(select auth.uid())` in policies and narrow RPCs for cross-profile reads.

## Root Decisions

- Do not copy production function bodies wholesale.
- Keep broad cross-profile reads behind narrow RPCs.
- Retain `SECURITY DEFINER` only where cross-row access is required and the function validates `auth.uid()`.
- Prefer `SECURITY INVOKER` for own-profile reads/updates and simple trigger calculations.
- Remove all default `PUBLIC` execution and grant only the required role per function.
