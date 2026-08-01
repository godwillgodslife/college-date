# Profile RLS Compatibility Impact

Date: 2026-08-01

Scope: existing web/Capacitor and native Phase 1 profile data access that may be affected by restricting anonymous `profiles` access and future owner-only profile policies.

## Summary

The proposed migration removes anonymous access to `profiles` and profile-derived views, and replaces broad `public` profile policies with authenticated-only transitional policies. It should not break the current protected web app because the product routes that consume discovery, leaderboard, confessions, matches, and profiles are behind `ProtectedRoute`.

The migration intentionally does not yet enforce authenticated owner-only reads across all profile access. That stricter step would break current discovery, leaderboard, profile-viewing, and nested match/profile summary queries until safe RPC/view contracts are shipped.

A stricter future migration that makes authenticated direct `profiles` access owner-only will require web query changes. Discovery, matched profiles, confessions notifications, profile viewing, and leaderboard/profile-derived joins should move to approved views or RPCs before that stricter migration.

## Query Impact Table

| Feature | Evidence | Auth state | Current query | Impact from proposed anon revoke | Impact from future owner-only direct profiles | Required action |
| --- | --- | --- | --- | --- | --- | --- |
| Public landing | `src/App.jsx` | Anonymous | No profile query found for landing | No expected break | No expected break | None. |
| Auth hydration | `src/contexts/AuthContext.jsx` | Authenticated owner | `profiles.select('*').eq('id', user.id)` | No break | Should still work through owner policy | Replace `select('*')` with explicit owner fields later. |
| OAuth repair | `src/pages/AuthCallback.jsx` | Authenticated owner | Select/upsert own `profiles` row | No break | Should still work through owner insert/select policy | Keep owner-only. |
| Onboarding | `src/pages/MiniProfileSetup.jsx`, `src/services/profileService.js` | Authenticated owner | Upsert own profile and profile photo URL | No break | Should still work through owner insert/update policy | Add backend validation later for age/photo/completion. |
| Profile edit | `src/services/profileService.js` | Authenticated owner | Select/update/upsert own profile | No break | Should still work for owner | Define editable fields allowlist. |
| Viewing another profile | `src/services/profileService.js` | Authenticated | `getProfile(userId).select('*')` | No break; transitional authenticated profile read remains | Breaks or should be denied | Move to matched-profile/discovery-safe RPC or view. |
| Discovery | `src/services/swipeService.js` | Authenticated | `discovery_feed_v3.select('*')` | No break if view remains authenticated | May break if view is `security_invoker` and profiles becomes owner-only | Replace with authenticated discovery RPC returning safe fields. |
| Discovery realtime | `src/pages/Match.jsx`, `src/pages/Explore.jsx` | Authenticated | Realtime `profiles` updates | Anonymous revoke may reduce unauthenticated exposure | Full-row profile updates are unsafe | Replace with channel scoped to safe feed/profile summary events. |
| Matches/conversations | `src/services/chatService.js` | Authenticated match participant | Nested `profiles!user1_id/user2_id(id, full_name, avatar_url, last_seen_at)` | No break | May break under owner-only direct profile RLS | Use match participant profile summary RPC/view. |
| Messaging | `src/services/chatService.js` | Authenticated match participant | `messages`, `matches`, nested profiles for conversation list | No break | Nested profile access needs safe contract | Keep message RLS; define profile summary access. |
| Confessions feed | `src/services/confessionService.js` | Protected route | `optimized_confessions.select('*')` | No break for signed-in users; anon access removed | Separate privacy blocker remains | Replace view with anonymous-safe/authenticated-safe view that hides poster/reactor/claimer ids. |
| Confession notifications | `src/services/confessionService.js` | Authenticated | Reads poster `profiles.confession_notifications` | No break | Should fail for non-owner | Move preference check into server-side notification function/RPC. |
| Referrals | `src/pages/Referrals.jsx`, `src/services/referralService.js` | Owner or anon validate RPC | Owner updates `referral_code`; anon calls `validate_referral_code` RPC | Direct anon profile revoke should not break security-definer validation RPC | Owner update still works | Keep RPC as public validation surface; do not expose table. |
| Leaderboard | `src/pages/Leaderboard.jsx`, `leaderboard_unified` view | Protected route | Reads `leaderboard_unified` | No break for signed-in users; anon access removed | View design still needs field review | Keep authenticated-only; remove sensitive fields if any. |
| Premium | `src/contexts/AuthContext.jsx`, `src/services/paymentService.js` | Owner/server | Owner reads `is_premium`, `premium_expires_at`; server webhooks update | No break | Owner reads work; server writes work | Do not expose expiry to discovery. |
| Wallet | `src/contexts/AuthContext.jsx`, wallet services | Owner/server | Wallet tables plus profile premium/quota fields | No break | Owner reads work | Keep wallet fields out of discovery. |
| Notifications | `src/services/notificationService.js`, `src/services/pushNotification.js` | Owner/server | Owner settings and push token sync in `profiles` | No break | Owner reads/writes work | Move push identifiers to device registry only. |
| Administration | `src/pages/AdminDashboard.jsx`, admin RPCs | Authenticated admin/server | Admin functions join profiles | No anon impact | Direct admin table access must use admin RPCs | Keep admin checks server-side. |
| Native Phase 1 auth | `android-native/.../SupabaseProfileRemoteDataSource.kt` | Authenticated owner | `profiles.select(id,name,username,avatar_url,is_onboarded)` | No anon impact | Owner read expected, but `name` is not a confirmed live column | Change native contract to `full_name` before relying on live profile fetch. |

## Compatibility Decision

Apply the anonymous revoke first after staging verification. Do not make `profiles` authenticated owner-only in the same production migration unless the web discovery/profile/messaging queries are updated or a safe replacement API is available.

## Anonymous Feature Dependency Audit

| Feature | Public route or entry point | Anonymous query today | Exact selected fields | Anonymous access intentional? | Expected behavior after anonymous revoke | Safe replacement contract |
| --- | --- | --- | --- | --- | --- | --- |
| Public landing page | `/` when no session, `src/pages/Landing.jsx` | No Supabase profile/view query found | None | No profile access needed | Should continue to render from bundled assets and static copy | Keep static marketing content or use a separate public marketing config with no profile rows. |
| Public profile links | Deep links to `/profile/:userId?` | Route is under `ProtectedRoute` | N/A before auth | No | Logged-out users should be routed to login/welcome before profile data loads | After auth, use discovery/matched-profile summary RPC. Do not expose direct `profiles`. |
| Referral-code validation | `/signup`, `src/services/referralService.js` | `rpc('validate_referral_code', { p_code })` | Function returns validation result; direct selected table fields are not in client code | Yes, but only through RPC | Should continue if RPC execute grant remains for `anon` | Keep `validate_referral_code(text)` as the only anonymous referral surface. Response should include only `valid`, normalized `code`, reason, and a display-safe first-name/handle if product-approved. |
| University list loading | Onboarding after auth, `src/pages/MiniProfileSetup.jsx` | Static `UNIVERSITY_OPTIONS` array | None | N/A | No impact | Future remote university catalog should be a dedicated public/read-only table or bundled config, not `profiles`. |
| Confessions preview | No public route found; `/confessions` protected | Protected service reads `optimized_confessions.select('*')` | `*` in service code | No anonymous access found in route design | Anonymous REST should fail after revoke; protected web should still work until privacy redesign | Replace with authenticated `confession_feed` view/RPC returning confession id/content/university/counts/current-user reaction state, not poster/reaction/claimer IDs. |
| Leaderboard preview | No public route found; `/leaderboard` protected | Protected service reads `leaderboard_unified.select('*')` | `*` in service code | No anonymous access found in route design | Anonymous REST should fail after revoke; protected web should still work | Keep authenticated-only view or RPC with reduced fields: rank, profile id, display name, avatar, university, display score, category. Review `total_spent` before display. |
| Premium information | Landing static copy; protected `/premium` | No anonymous profile/view query found for premium page route | None before auth | Public pricing copy may be intentional, profile access is not | Static premium copy should continue | Public product catalog should use `paid_products`/`monetization_config` only if reviewed for anonymous read; never use `profiles.is_premium`. |
| App configuration | `AnnouncementBanner` inside `AppLayout` | `app_config.select('key, value')` after protected layout mounts | `key`, `value` | Authenticated app config only in current route structure | No profile revoke impact | If public banners are needed, use a narrow public config view with approved keys only. |
| Password recovery | `/forgot-password`, `/reset-password` | Supabase Auth methods, no profile table query before reset session | None from `profiles` | Yes, auth-only public flow | No profile revoke impact | Keep Supabase Auth flow; do not look up profiles by email client-side. |
| Deep links | `/auth/callback`, `/payment/callback`, notification redirects | Auth callback may upsert owner profile after session; payment callback invokes server verification | Owner `profiles.select('id')` after auth session only | Yes after session, not anonymous | No anonymous profile access should be required | Ensure every callback establishes a session before owner profile access. |

## Safe Replacement Contracts For Exposed Views

### Discovery

- Decision: remove anonymous access now; replace broad authenticated view access with an authenticated RPC before native discovery.
- Preferred contract: `get_discovery_profiles(p_limit integer, p_cursor text, p_filters jsonb default '{}')`.
- Authentication: authenticated only, derive caller from `auth.uid()`.
- Required filtering: caller not null, caller onboarded, target onboarded, target not self, not blocked either direction, not already swiped/matched where applicable, age/preference/campus filters server-side.
- Safe output fields: `id`, `display_name`, `username`, `avatar_url`, `profile_photos`, `age`, `gender`, `university`, `department`, `faculty`, `level`, `bio`, `interests`, `attraction_goal`, `is_verified`, `ai_verification_status`, `premium_badge`, `presence_label`, `cursor`.
- Excluded fields: `email`, phone, push tokens, exact last-seen timestamps, `is_onboarded`, moderation flags, premium expiry, referral fields, notification settings, internal scores.

### Leaderboard

- Decision: remove anonymous access now; keep authenticated-only only after field review.
- Preferred contract: authenticated view/RPC such as `get_leaderboard(p_category text, p_limit integer)`.
- Safe output fields: `rank`, `profile_id`, `display_name`, `avatar_url`, `university`, `category`, `display_score`, `is_current_user`.
- Requires review: `total_spent` may reveal spending behavior and should be replaced with a tier/badge unless product owner approves exact display.

### Confessions

- Decision: remove anonymous access now; existing `optimized_confessions` is not anonymity-safe because repository evidence includes poster, reactor, and claimer identifiers.
- Preferred contract: authenticated RPC/view such as `get_confession_feed(p_university text, p_limit integer, p_cursor text)`.
- Safe output fields: `id`, `content`, `university`, `created_at_bucket` or coarse timestamp, `total_reactions`, `comment_count`, `is_viral`, current user's own reaction/claim state.
- Excluded fields: `user_id`, reaction user ids, claimer ids, poster profile fields.
- Notification side effects should be server-side so the client does not read poster notification preferences.

### Referral Validation

- Decision: retain anonymous RPC, do not expose direct profile/table access.
- Existing contract: `validate_referral_code(p_code text)`.
- Safe output fields: `valid`, `code`, `reason`, optional `referrer_name` as first name/handle only.
- Excluded fields: referrer profile id unless needed after auth, email, referral relationship counts, wallet/reward details.
