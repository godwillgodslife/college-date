# Current System Audit

Date: 2026-08-01

Scope: local repository inspection only. No production Supabase schema changes, migrations, deployments, payment changes, APK/AAB publication, or service-role access were performed.

## Summary

The current product is a React/Vite web app packaged for Android through Capacitor. The production Android application ID is `com.collegedate.app`; the existing wrapper has `versionCode 33`, `versionName 2.2.36`, `minSdk 24`, `compileSdk 36`, and `targetSdk 36`.

Evidence:

- Web framework and dependencies: `package.json:30`
- Capacitor app id: `capacitor.config.json:2`
- Android wrapper namespace/application id/version: `android/app/build.gradle:5`, `android/app/build.gradle:8`, `android/app/build.gradle:11`, `android/app/build.gradle:12`
- SDK levels: `android/variables.gradle:2`, `android/variables.gradle:3`, `android/variables.gradle:4`

## Authentication

Existing auth is Supabase JS with PKCE, persisted sessions, auto refresh, native deep links, and a native storage adapter in the Capacitor shell. Login uses `signInWithPassword`; signup uses `signUp` with profile metadata; password reset uses `resetPasswordForEmail`; auth state is driven by `onAuthStateChange`.

Evidence:

- Supabase client creation and PKCE: `src/lib/supabase.js:17`, `src/lib/supabase.js:24`
- Session observer: `src/contexts/AuthContext.jsx:387`
- Login: `src/contexts/AuthContext.jsx:515`
- Signup: `src/contexts/AuthContext.jsx:542`, `src/contexts/AuthContext.jsx:545`
- Password reset: `src/contexts/AuthContext.jsx:719`
- Native callback URLs are referenced in auth context and callback pages.

## Supabase Client Configuration

The frontend uses public client configuration from Vite env vars:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PUBLIC_APP_URL`
- `VITE_ENABLE_NATIVE_PUSH`
- `VITE_ONESIGNAL_APP_ID`
- `VITE_REVENUECAT_ANDROID_KEY`
- `VITE_REVENUECAT_IOS_KEY`
- `VITE_ENABLE_OFFLINE_PAID_SWIPES`
- `VITE_ENABLE_SWIPE_QA`

Service-role keys, Paystack secrets, RevenueCat webhook auth, OpenRouter keys, Firebase service-account files, signing keys, and keystore passwords must remain server-side or local-only.

## Backend Dependency Inventory

Confidence levels: High means direct source evidence exists; Medium means source evidence exists but input/output requires backend review; Low means inferred from names or old docs and needs confirmation.

| Name | Purpose | Where used | Input | Output | Auth | Public mobile safe | Native changes | Confidence | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| `profiles` | User profile, onboarding, premium, presence | Auth, onboarding, discovery, profile | User id/profile fields | Profile row | Authenticated for personal data | Only with RLS confirmed | Reuse for auth/onboarding; defer broad writes | High | `src/contexts/AuthContext.jsx:253`, `src/services/profileService.js:94` |
| `wallets` | Wallet balance | Auth hydration, wallet | `user_id` | Balance row | Authenticated | Read own wallet only if RLS confirmed | Deferred | High | `src/contexts/AuthContext.jsx:254`, `src/pages/Wallet.jsx:118` |
| `subscriptions` | Premium entitlement | Auth hydration, premium | `user_id` | Plan/status/end date | Authenticated | Own subscription only | Reuse later | High | `src/contexts/AuthContext.jsx:255` |
| `swipes` | Likes/passes | Discovery/matching | swiper/target/type | Swipe rows | Authenticated | RLS/RPC only | Deferred | High | `src/services/swipeService.js` |
| `matches` | Mutual matches | Chat, match list, messaging | match id/users | Match rows | Authenticated | RLS required | Deferred | High | `src/services/chatService.js:13` |
| `messages` | Chat messages | Chat service | match/message fields | Message rows | Authenticated | RLS tied to real match | Deferred | High | `src/services/chatService.js:94`, `src/services/chatService.js:114` |
| `notifications` | In-app notifications | Notification context/service | recipient/type/metadata | Notification rows | Authenticated | Actor/recipient guards required | Deferred | High | `src/contexts/NotificationContext.jsx:232` |
| `user_notification_devices` | Push device registry | Push service | device token/platform | Device row | Authenticated | Safe if token scoped to user | Deferred | High | `src/services/pushNotification.js:101` |
| `wallet_transactions` | Wallet ledger | Wallet/payment | wallet/user/amount/type | Transaction rows | Authenticated/admin | Client direct writes unsafe | Deferred | High | `src/pages/Wallet.jsx`, `src/services/paymentService.js` |
| `referrals` | Referral attribution/rewards | Signup/referrals | referral code/user | Referral rows | Authenticated | Use RPCs | Deferred | High | `src/services/referralService.js` |
| `boosts` | Boost/super swipe grants | Payments/discovery | user/product/expiry | Boost rows | Authenticated/admin | Do not client-grant paid items | Deferred | Medium | `src/services/paymentService.js`, `supabase/functions/revenuecat-webhook/index.ts` |
| `profile_views` | Profile viewer counts | Viewers | viewer/profile | Viewer summary | Authenticated | Use secure RPC | Deferred | High | `src/pages/Viewers.jsx:43` |
| `discovery_feed_v3` | Optimized discovery feed | Swipe/discovery | user/filter params | Profile cards | Authenticated | Needs RLS/security-invoker confirmation | Deferred | High | `src/services/swipeService.js` |
| `leaderboard_unified` | Leaderboard view | Leaderboard | filters | Leaderboard rows | Authenticated | Read-only if RLS/view safe | Deferred | Medium | `src/pages/AdminDashboard.jsx`, docs |
| `optimized_confessions` | Confession feed view | Confessions | filters | Confession rows | Authenticated | Requires policy review | Deferred | Medium | `src/services/confessionService.js` |
| `confessions` | Anonymous campus posts | Confessions | content/media | Confession rows | Authenticated | Requires moderation/RLS | Deferred | High | `src/services/confessionService.js` |
| `confession_comments` | Confession comments | Confessions | confession/comment | Comment rows | Authenticated | Requires moderation/RLS | Deferred | Medium | `src/services/confessionService.js` |
| `confession_reactions` | Confession reactions | Confessions | reaction id/type | Reaction rows | Authenticated | Own reaction rules required | Deferred | High | `src/services/confessionService.js:152` |
| `confession_claims` | Confession claim flow | Confessions | claim fields | Claim rows | Authenticated | Needs review | Deferred | Low | Source inventory |
| `snapshots`, `snapshot-media`, `snap_media`, `direct_snaps` | Status/snap media | Snap/status services | media/profile/status | Media/status rows | Authenticated | Storage/RLS required | Deferred | Medium | `src/services/snapshotService.js`, `src/services/statusService.js` |
| `status_updates`, `status_views`, `statuses`, `status-media` | Status posts/views | Status service | status/media/view fields | Status rows | Authenticated | Storage/RLS required | Deferred | Medium | `src/services/statusService.js` |
| `feed_impressions` | Discovery impression tracking | Feed impression service | profile/card ids | Impression row/result | Authenticated | Safe through RPC | Deferred | High | `src/services/feedImpressionService.js:20` |
| `gifts` | Gift catalog/purchase | Gift service | product/user | Gift result | Authenticated | Paid/economy guarded RPC only | Deferred | Medium | `src/services/giftService.js:19` |
| `payout_details` | Payout info | Wallet/admin | payout fields | Payout row | Authenticated/admin | Sensitive; avoid broad cache | Deferred | Low | Source inventory |
| `app_config` | Remote flags/settings | Admin/app config | key/value | Config rows | Admin/read as allowed | Read-only public config only | Deferred | Medium | `src/pages/AdminDashboard.jsx:1168` |
| `avatars` storage/table | Avatar media | Profile/media | file path | Public/signed URL | Authenticated writes | Bucket policy required | Deferred | Medium | Storage inventory |
| `profile-photos` storage | Profile photos | Onboarding/profile | image file | Public/signed URL | Authenticated writes | Bucket policy confirmed in migration docs | Deferred | High | `supabase/migrations/20260613102000_restore_profile_photo_storage_policies.sql` |
| `voice-intros` storage | Voice intro media | Profile/call | audio file | URL | Authenticated writes | Bucket policy required | Deferred | Medium | Storage inventory |
| `chat-media` storage | Chat attachments | Chat | media file | URL | Authenticated match members | Bucket policy required | Deferred | Medium | `src/services/chatService.js` |
| `admin_*` RPCs | Admin dashboards, moderation, finance | Admin dashboard/functions | admin filters/actions | Admin data/action result | Admin only | Not safe in public client except admin-gated screens | Deferred | High | `src/pages/AdminDashboard.jsx` |
| `is_app_admin` RPC | Admin authorization | Admin route | none | boolean | Authenticated | Safe if SECURITY DEFINER hardened | Native admin deferred | High | `src/components/AdminRoute.jsx:29` |
| `validate_referral_code` RPC | Referral validation | Signup | code | valid/result | Public/authenticated | Safe if read-only | Reuse later | High | `src/services/referralService.js:33` |
| `apply_referral_code` RPC | Apply referral | Signup/auth callback | code/user | result | Authenticated | Safe if idempotent | Reuse later | High | `src/services/referralService.js:46` |
| `check_and_reset_swipe_limit` RPC | Swipe quota | Swipe service | user id | quota state | Authenticated | Safe if self-scoped | Deferred | High | `src/services/swipeService.js:324` |
| `process_swipe_payment` RPC | Wallet debit/reward for swipes | Swipe service | operation/user ids | payment result | Authenticated | Must remain server-side guarded | Deferred | High | `src/services/swipeService.js:403` |
| `send_super_swipe` RPC | Atomic super swipe | Swipe service | target id | result | Authenticated | Safe if RLS/RPC guards confirmed | Deferred | High | `src/services/swipeService.js:653` |
| `accept_swipe_request` RPC | Accept admirer/request | Requests/swipe | request/swiper id | match result | Authenticated | Safe if self-scoped | Deferred | High | `src/services/swipeService.js:548` |
| `update_swipe_streak` RPC | Streak tracking | Swipe service | user id | streak result | Authenticated | Safe if self-scoped | Deferred | Medium | `src/services/swipeService.js:383` |
| `get_admirers_secure` RPC | Admirer list | Chat/requests | limit | admirer rows | Authenticated | Preferred over direct table reads | Deferred | High | `src/pages\Requests.jsx:29` |
| `get_profile_viewers_secure` RPC | Viewer list | Chat/viewers | limit | viewer rows | Authenticated | Preferred over direct table reads | Deferred | High | `src/pages/Viewers.jsx:43` |
| `get_hidden_content_counts` RPC | Premium locked counts | Status/snapshot | user id | counts | Authenticated | Safe if self-scoped | Deferred | High | `src/services/statusService.js:109` |
| `record_feed_impression` RPC | Discovery impression | Feed service | impression data | result | Authenticated | Safe if self-scoped | Deferred | High | `src/services/feedImpressionService.js:20` |
| `increment_snapshot_likes` RPC | Snapshot likes | Snapshot service | row id | result | Authenticated | Safe if constrained | Deferred | Medium | `src/services/snapshotService.js:90` |
| `update_user_presence` RPC | Presence timestamps | Profile/auth | none/user context | result | Authenticated | Safe if self-only | Reuse later | High | `src/services/profileService.js:235` |
| `register_notification_device` / `revoke_notification_device` RPCs | Push device management | Push service | token/platform | result | Authenticated | Safe if self-scoped | Reuse later | High | `src/services/pushNotification.js:101`, `src/services/pushNotification.js:457` |
| `insert_notification` RPC | Notification creation | Notification service | notification args | result | Authenticated | Needs anti-forgery guard | Deferred | High | `src/services/notificationService.js:160` |
| `process_gift_purchase` RPC | Gift economy | Gift service | gift/user | result | Authenticated | Server-guarded only | Deferred | Medium | `src/services/giftService.js:19` |
| `purchase_premium_with_wallet`, `purchase_boost`, `request_wallet_withdrawal`, `process_pending_referral_funds`, `unlock_matured_rewards` RPCs | Wallet/premium economy | Payment/wallet/referrals | product/amount/user | result | Authenticated | Do not alter in phase 1 | Deferred | High | `src/services/paymentService.js`, `src/pages/Referrals.jsx:165` |
| `initialize-paystack-payment`, `verify-paystack-transaction`, `verify-paystack-status` Edge Functions | Web payment verification | Payment service | product/reference | payment/verification result | JWT where applicable | Do not call for native phase 1 | Deferred | High | `src/services/paymentService.js:89`, `src/services/paymentService.js:217` |
| `revenuecat-webhook` Edge Function | Android subscription webhook | RevenueCat backend | RevenueCat event | entitlement updates | Webhook auth, JWT disabled | Server-only, never client-call | No native client secret | High | `supabase/functions/revenuecat-webhook/index.ts` |
| `ai-profile-review`, `ai-assistant` Edge Functions | AI review/assistant | AI services | task/profile/message data | AI response | JWT enabled | Safe via Edge Function; keys server-side | Deferred | High | `src/services/aiTrustService.js:5`, `src/services/aiAssistantService.js:5` |
| `agora-call-token` Edge Function | Call token generation | Call service | channel/user | Agora token | Authenticated | Use server endpoint only | Deferred | High | `src/services/agoraTokenService.js:4` |
| `send-notification-email`, `send-notification-push`, `admin-push-broadcast` Edge Functions | Notification delivery | Notification/admin services | notification payload | delivery result | JWT/admin depending function | Push admin functions not public-client safe | Deferred | High | `src/services/notificationService.js:446`, `src/pages/AdminDashboard.jsx:2001` |

## Realtime Subscriptions

- Notifications: `public:notifications:${currentUser.id}` on `notifications`.
- Presence: `presence-global`.
- Chat messages: `match:${matchId}` and `presence:${matchId}`.
- Dashboard/wallet: `dashboard_updates:${currentUser.id}`, `wallet_updates:${currentUser.id}`.
- Discovery: `discovery-realtime`.
- Requests: `incoming_swipes:${currentUser.id}`.

Evidence: `src/contexts/NotificationContext.jsx:232`, `src/contexts/AuthContext.jsx:478`, `src/services/chatService.js:364`, `src/services/chatService.js:385`, `src/pages/Dashboard.jsx:47`, `src/pages/Wallet.jsx:83`, `src/pages/Match.jsx:184`, `src/pages/Requests.jsx:79`.

## Notifications

The web/Capacitor app uses OneSignal and Firebase Cloud Messaging backing for Android. Device registration is mediated through notification RPCs. Native push token registration is intentionally deferred in the new Compose project.

## Payments, Premium, Referrals, Wallet

Web payments use Paystack functions. Android wrapper subscriptions use RevenueCat with entitlement `Premium`; server webhook updates `profiles.is_premium`, `profiles.premium_expires_at`, and `subscriptions`. Wallet and referral economy use server RPCs. No payment logic was modified or reimplemented in the native project.

## Profile, Discovery, Matching, Messaging

Profile and onboarding currently read/write `profiles`. Discovery uses `discovery_feed_v3`, `swipes`, swipe limit/payment RPCs, and realtime profile updates. Matching uses `swipes` plus `matches`. Messaging uses `matches`, `messages`, chat media storage, and realtime channels. Native phase 1 only reads `profiles.id,name,username,avatar_url,is_onboarded` after auth.

## Routes And Screens

Existing route inventory is in `src/App.jsx:300-343`: login, signup, password recovery, reset password, auth callback, payment callback, dashboard, match, explore, chat, status, snap, profile, profile edit, settings, referrals, wallet, requests, leaderboard, confessions, premium, viewers, notifications, mini profile setup, call room, and admin.

## Visual Tokens

Primary dark tokens are in `src/index.css:17-52`:

- Background: `#0a0a0f`, `#13131a`, `#1a1a24`
- Accent: `#6C63FF`, `#FF6B9D`, `#00D2FF`
- Radii: 8, 14, 20, 28, full
- Bottom navigation and glass/elevation patterns appear in shared CSS and wireframe files.

## Loading, Empty, Error, Offline States

The web app has loading spinners/skeleton-like route loading, toast/error banners, empty states across list pages, cached native data through persistent SWR helpers, and native service-worker/cache cleanup for the Capacitor shell. Native phase 1 provides reusable Compose `LoadingState`, `EmptyState`, `ErrorBanner`, and `OfflineBanner` components.

## RLS Evidence

Repository evidence indicates RLS is enabled and was recently hardened for key tables in docs and migrations, including `profiles`, `matches`, `notifications`, `subscriptions`, `swipes`, `wallets`, and `wallet_transactions`. Live RLS was not verified in this phase because no production database inspection or migrations were performed. Native phase 1 therefore limits live client data access to `profiles` onboarding-state lookup and documents broader integrations as deferred until RLS is reconfirmed.

Evidence: `docs/production-readiness-diagnosis.md`, `docs/premium-payment-remediation/20-rls-verification.md`, `supabase/migrations/20260613102000_restore_profile_photo_storage_policies.sql`.
