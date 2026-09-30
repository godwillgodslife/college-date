# Design Handoff Technical Validation

Date: 2026-08-01

Scope: review and technically validate the completed Antigravity UX/UI reconciliation and handoff documents for the native Android migration. This report is verification-only. It does not modify the existing web/Capacitor application, production Supabase schema, payment behavior, or Antigravity source documents.

## 1. Executive verdict

The Antigravity handoff is useful as a UX direction and screen planning artifact, but it is not yet a technically authoritative implementation contract.

Native UI implementation may begin for low-risk shell, auth, design-system, and clearly labelled placeholder screens. Backend-connected Phase 2 screens should not begin from the handoff as written because several documents overstate implementation readiness, treat proposed native behavior as verified production behavior, and omit or soften security blockers around profile RLS, confessions privacy, payment readiness, calls, notifications, and offline sync.

The most important correction is to split "desired native design" from "verified backend contract." The current handoff often blends those together.

## 2. Documents reviewed

Reviewed Antigravity handoff and reconciliation documents:

- `docs/native-android/antigravity-native-ui-plan.md`
- `docs/native-android/authoritative-native-screen-inventory.md`
- `docs/native-android/authoritative-native-user-flow.md`
- `docs/native-android/codex-native-ui-handoff.md`
- `docs/native-android/design-decisions-required.md`
- `docs/native-android/design-reconciliation-report.md`
- `docs/native-android/design-source-inventory.md`
- `docs/native-android/live-app-screen-inventory.md`
- `docs/native-android/native-design-system.md`
- `docs/native-android/original-wireframe-inventory.md`
- `docs/native-android/web-wrapper-behaviours-to-remove.md`
- `docs/native-android/wireframe-live-app-comparison.md`

Reviewed existing Phase 1 and Phase 1.5 native migration documents:

- `docs/native-android/current-system-audit.md`
- `docs/native-android/native-migration-map.md`
- `docs/native-android/architecture-decision-record.md`
- `docs/native-android/offline-data-policy.md`
- `docs/native-android/phase-1-verification-report.md`
- `docs/native-android/phase-1.5-auth-verification-report.md`
- `docs/native-android/rls-verification-report.md`
- `docs/native-android/play-store-native-migration-readiness.md`

Reviewed source evidence from:

- `package.json`
- `capacitor.config.json`
- `android/app/build.gradle`
- `android/app/src/main/AndroidManifest.xml`
- `android-native/app/build.gradle.kts`
- `android-native/gradle/libs.versions.toml`
- `android-native/app/src/main/java/com/collegedate/app/...`
- `src/contexts/AuthContext.jsx`
- `src/pages/MiniProfileSetup.jsx`
- `src/pages/Signup.jsx`
- `src/pages/Match.jsx`
- `src/pages/Chat.jsx`
- `src/pages/VoiceCallRoom.jsx`
- `src/services/referralService.js`
- `src/services/swipeService.js`
- `src/services/chatService.js`
- `src/services/confessionService.js`
- `src/services/paymentService.js`
- `src/services/pushNotification.js`
- `src/services/notificationService.js`
- `supabase/functions/...`
- `supabase/migrations/...`
- `supabase/performance_views.sql`

## 3. Verified contracts

- The current web app is a Vite/React SPA wrapped by Capacitor for Android. Evidence: `package.json`, `capacitor.config.json`, `android/app/build.gradle`.
- The existing wrapper application ID is `com.collegedate.app`. Evidence: `capacitor.config.json`, `android/app/build.gradle`.
- The existing wrapper version currently visible in the repository is `versionCode 33` and `versionName 2.2.36`. Evidence: `android/app/build.gradle`.
- The native Phase 1 project uses the same production application ID, with debug suffix `.debug`, `versionCode 1`, and `versionName 0.1.0-native-phase1`. Evidence: `android-native/app/build.gradle.kts`.
- The native Phase 1 stack is Kotlin, Jetpack Compose, Material 3, Hilt, Navigation Compose, Room, DataStore, WorkManager, Coil, Firebase Messaging, and Supabase Kotlin. Evidence: `android-native/gradle/libs.versions.toml`, `android-native/app/build.gradle.kts`.
- Native Supabase auth configuration is exposed through generated public BuildConfig fields, not hard-coded Kotlin credentials. Evidence: `android-native/app/build.gradle.kts`, `android-native/.gitignore`, `android-native/local.properties.example`.
- Native auth uses Supabase Kotlin Auth with PKCE, auto refresh, and auto load from storage. Evidence: `android-native/app/src/main/java/com/collegedate/app/core/network/SupabaseModule.kt`.
- Native auth routing is implemented through a route decision layer and covered by tests. Evidence: native auth route decider and unit tests under `android-native/app/src/test/...`.
- Current web onboarding collects full name, age, university, level, interests, intent, and at least one photo before setting `profiles.is_onboarded = true`. Evidence: `src/pages/MiniProfileSetup.jsx`.
- Current web signup accepts email, password, confirm password, gender role, and optional referral code. Evidence: `src/pages/Signup.jsx`.
- Referral validation and application use RPCs `validate_referral_code({ p_code })` and `apply_referral_code({ p_code })`. Evidence: `src/services/referralService.js`, `supabase/migrations/20260725130000_secure_referral_code_flow.sql`.
- Discovery currently reads `discovery_feed_v3` as a PostgREST relation via `.from('discovery_feed_v3')`, not as an RPC. Evidence: `src/services/swipeService.js`.
- Standard swipe payment and wallet/premium handling are centralized through `process_swipe_payment`, with an idempotent overload using `p_client_operation_id`. Evidence: `src/services/swipeService.js`, `supabase/migrations/20260715152000_offline_media_and_swipe_idempotency.sql`.
- Premium users are intended to bypass free swipe limits and wallet debits through profile/subscription checks. Evidence: `supabase/migrations/20260715152000_offline_media_and_swipe_idempotency.sql`, `supabase/migrations/20260522101716_premium_subscription_swipe_rpc_fix.sql`.
- Messaging uses `matches`, `messages`, `chat-media`, realtime row subscriptions, and presence channels. Evidence: `src/services/chatService.js`, `src/pages/Chat.jsx`, `supabase/migrations/20260525213000_chat_media_disappearing_messages.sql`.
- Voice/video calls currently use Agora Web SDK and an `agora-call-token` Supabase Edge Function that validates the authenticated user is a match participant before issuing a token. Evidence: `src/pages/VoiceCallRoom.jsx`, `supabase/functions/agora-call-token/index.ts`.
- Paystack checkout is server-initialized and server-verified through Supabase Edge Functions. Evidence: `src/services/paymentService.js`, `supabase/functions/initialize-paystack-payment/index.ts`, `supabase/functions/verify-paystack-transaction/index.ts`.
- RevenueCat webhook handling exists server-side and grants entitlements using server-side credentials. Evidence: `supabase/functions/revenuecat-webhook/index.ts`.
- Notification device registration, notification insert hardening, and user notification device storage exist in migrations. Evidence: `supabase/migrations/20260714120000_notification_reliability_phase_a.sql`.
- Native Android Phase 1 includes FCM service scaffolding, but not completed push registration/rendering. Evidence: `android-native/app/src/main/java/com/collegedate/app/core/notifications/CollegeDateMessagingService.kt`.
- Native Room currently contains only `cached_profiles` and `pending_writes` foundations. Evidence: native database entities under `android-native/app/src/main/java/com/collegedate/app/core/database/...`.

## 4. Partially verified contracts

- `profiles.is_onboarded` is the current routing hint for onboarding completion, but it is not enough by itself to prove a complete adult student profile. Web code also checks name, university, and photo before redirecting to match. Evidence: `src/pages/MiniProfileSetup.jsx`, `src/contexts/AuthContext.jsx`.
- Adult-age eligibility is enforced in current web onboarding UI, but DB-level enforcement was not confirmed from repository evidence. Native should not assume the backend rejects under-18 profile updates unless the owner verifies constraints or policies.
- Swipe quota rules are partially verified. `process_swipe_payment` has strong auth guards and premium bypass logic, but direct client access to `check_and_reset_swipe_limit(p_user_id)` needs live grant and RLS verification because the reviewed function takes a user id parameter.
- Discovery feed behavior is partially verified. The web app applies substantial client-side filtering and ranking after reading `discovery_feed_v3`; native should not assume the backend already returns a safe, final personalized feed.
- Messaging RLS appears strong in the reviewed migration for messages and chat media, but live deployment state was not reverified during this validation pass.
- Notification routing and backend device registry are partially verified for the web/Capacitor app. The new Kotlin native app does not yet implement equivalent OneSignal registration or foreground notification rendering.
- Payment architecture is partially verified from source and migration evidence. Production payment readiness still depends on controlled payment tests and platform policy decisions already marked blocked in payment remediation docs.
- Play Store replacement readiness is partially verified because native and wrapper share `com.collegedate.app`. Upload-readiness still depends on version code, signing key continuity, deep link parity, and user-session migration decisions.

## 5. Unsupported assumptions

- The handoff assumes onboarding fields and completeness rules are fully backend-enforced. Current evidence only proves frontend validation and use of `profiles.is_onboarded`.
- The handoff assumes `profiles.is_onboarded` and profile summary reads are safe for unauthenticated/public clients. Phase 1.5 evidence found anonymous REST could read at least `profiles.id` and `profiles.is_onboarded`.
- The handoff assumes confessions are anonymous by backend contract. Repository evidence shows `optimized_confessions` includes `user_id`, reaction user ids, and claimer ids in `supabase/performance_views.sql`.
- The handoff assumes Room already covers discovery cards, chats, profile summaries, and offline swipes. Native Phase 1 only has a profile cache and pending-write scaffold.
- The handoff assumes notification behavior can be treated as native FCM. The Kotlin native project only has an FCM service placeholder; the production wrapper uses OneSignal and Capacitor paths.
- The handoff assumes calls can be bridged as a temporary native-safe screen. Current calls are implemented through Agora Web SDK in React and need native Agora or a carefully reviewed temporary containment strategy.
- The handoff assumes payment flows are non-blocking for native UI implementation. Wallet, Play Billing, RevenueCat, and Paystack require stricter production/runtime verification and policy review before native release.
- The handoff assumes no horizontal overflow, 60/120Hz gestures, keyboard behavior, and dark-mode quality. These require device or emulator verification.
- The handoff assumes all listed screens are unblocked. Several are blocked by RLS, privacy, runtime, or product-owner decisions.

## 6. Incorrect claims

- `live-app-screen-inventory.md` identifies the web stack as React 18, React Router v6, and Tailwind/Vanilla CSS. `package.json` shows React 19.2.0, React Router DOM 7.13.0, Vite 7.3.1, and no Tailwind dependency in the manifest reviewed.
- Some handoff text says the native stack is Kotlin 2.0+ and Supabase Kotlin SDK 2.x. The native version catalog uses Kotlin 2.3.21 and Supabase Kotlin BOM 3.6.0.
- `codex-native-ui-handoff.md` describes `discovery_feed_v3` as an RPC with `p_limit` and `p_offset`. The web app reads it as a PostgREST relation/view with `.from('discovery_feed_v3').select('*')`.
- Several RPC parameter names are imprecise in the handoff. For example, referral calls use `p_code`, and swipe-limit checks use `p_user_id` in the reviewed source.
- Onboarding handoff material mentions department as a current required onboarding field. The current `MiniProfileSetup.jsx` onboarding flow collects level, not department.
- Calls are described in places as generic WebRTC behavior. The current implementation uses `agora-rtc-sdk-ng` and the `agora-call-token` Edge Function.
- "Web OneSignal replaced by native FCM" is not correct for the Kotlin native project. Native currently has FCM scaffolding only.
- "Room caches discovery cards/chat messages/profile summaries" is not correct for the current native project. Those are proposed future entities, not implemented cache contracts.
- "Sign out purges all Room DB tables" is not fully implemented because most future Room tables do not exist yet.
- "Zero blockers" or "100% unblocked" claims for onboarding, profile, discovery, confessions, payments, calls, and notifications are not supported.

## 7. Runtime-only verification requirements

These items cannot be accepted from document or source review alone:

- Cold launch, splash, login rendering, keyboard behavior, form scrolling, and Android back behavior on real Android devices.
- Session restoration after process death and force close.
- Token refresh behavior under expired access-token conditions.
- Offline launch, offline login attempt, reconnect behavior, and poor-network states.
- No horizontal overflow and no browser-like zooming on small, midrange, and large Android devices.
- Dark mode contrast and font-scaling behavior.
- Gesture feel for swipe cards, including frame pacing and touch latency.
- Push permission prompt, native OneSignal/FCM registration, notification receipt, and deep link opening.
- Camera, microphone, and media permission flows for calls or profile photos.
- RevenueCat purchase, restore, cancellation, expiration, and webhook propagation.
- Paystack hosted checkout behavior if any native wallet/web payment surface remains.
- Deep-link callbacks for auth reset, payment callbacks, chat/call routes, and notification routes.

## 8. Product-owner decisions still required

- Whether native onboarding completion is defined by `profiles.is_onboarded` alone or by a strict field set such as age, university, level, interests, intent, and photo.
- Whether adult-age eligibility must be enforced by database policy/constraint, server function, or client validation plus audit only.
- Whether Nigerian campus selection must remain a curated static list, be remotely configured, or be a backend table.
- Whether confessions are truly anonymous and what data may be visible to clients, moderators, and notification recipients.
- Whether calls should be rebuilt with a native Agora SDK now, deferred, or temporarily opened through a constrained web surface.
- Whether Paystack should exist in the native app at all, considering Google Play payment policy and digital goods rules.
- Whether wallet features ship in the first native Play update or remain deferred until native payment verification is complete.
- Whether existing wrapper users must keep local WebView sessions after updating, or whether native must force re-authentication.
- Whether the first native upload replaces the current Play listing or ships as internal testing only until feature parity.

## 9. Authentication and onboarding findings

Authentication foundation is the safest part of the native migration. The native app has BuildConfig-based public Supabase configuration, PKCE auth, route decision tests, login/register/password-reset ViewModel tests, logout handling, and profile onboarding routing based on profile state.

The main gap is live environment verification. Phase 1.5 documentation records that no emulator/device and no approved test account were available for complete auth verification. Therefore the handoff must not claim successful device-level auth verification unless that test is run later.

Onboarding is not fully settled. The current web contract is:

- name length greater than 1
- age at least 18
- university selected
- level selected
- at least 3 interests
- intent selected
- at least 1 profile photo
- write `is_onboarded = true`

Native implementation must preserve this unless the product owner changes it. The backend enforcement for age/photo/university/profile completeness was not confirmed. Also, Phase 1.5 RLS evidence showed anonymous clients could read public profile fields including `is_onboarded`, which blocks treating profile routing fields as private until policies are fixed or explicitly accepted.

## 10. Swipe and match findings

The design direction for discovery and swipe can be used visually, but implementation must stay deferred until the backend contract is corrected and verified.

Verified source behavior:

- Discovery reads from `discovery_feed_v3` as a view/relation.
- The web client excludes already swiped and matched users.
- It applies filters for gender, university, age range, category, and live state.
- It performs client-side ranking and opposite-gender/same-campus prioritization.
- Right swipes can trigger `process_swipe_payment`.
- Super Swipes use `send_super_swipe({ p_target_id })`.
- Mutual matches are created when reciprocal right swipes exist.

Risks:

- Native should not copy broad client-side profile queries without RLS proof.
- `discovery_feed_v3` must be reviewed as a public mobile feed contract, not treated as an opaque safe source.
- Swipe quota and payment correctness should rely on server-enforced RPCs, not client counters.
- Direct callable access to `check_and_reset_swipe_limit(p_user_id)` needs live grant review because user-id parameters are sensitive.
- Offline swipe queues must be idempotent and must not allow double wallet debits.

## 11. Messaging and call findings

Messaging has stronger backend evidence than discovery, but should still be implemented after live RLS verification.

Verified source behavior:

- Conversations are based on `matches`.
- Messages are stored in `messages`.
- Realtime uses filtered Postgres changes by `match_id`.
- Typing uses realtime presence channels.
- Chat media uses the private `chat-media` bucket and signed URLs.
- Disappearing messages are controlled by `update_match_disappearing_messages`.
- Stickers and reactions are stored as message type/metadata.

The reviewed chat media migration includes participant-only policies for message read/write and media access. That is a good candidate for reuse, pending live policy confirmation.

Calls are not safe to classify as "native frontend rewrite only." Current calls are React screens using Agora Web SDK. The Edge Function token authorization looks sound from source review, but the native UI must use a native Agora integration or a formally approved temporary containment plan. A generic WebView or browser-like call surface conflicts with the native migration goal and introduces permission, session, navigation, and Play review risk.

## 12. Confessions privacy findings

Confessions are a security and privacy blocker.

Repository evidence shows `optimized_confessions` includes:

- confession `user_id`
- reaction data containing reacting user ids
- claimer ids

The same performance view file grants select to `anon` and `authenticated`. Even if production policies have changed since that file, the handoff cannot claim anonymous-safe confessions until the live view definition, grants, and RLS behavior are verified.

Native should defer confessions until there is a dedicated mobile-safe contract that does not expose poster identity, reaction identity, or claimer identity beyond the intended product behavior.

## 13. Premium, wallet and payment findings

The payment handoff is directionally aligned but overstates readiness.

Verified source behavior:

- RevenueCat is the Android subscription path in the wrapper.
- RevenueCat entitlement identifier is `Premium`.
- Android product mapping is documented as `premium_monthly:monthly-base`.
- RevenueCat webhook code updates profile/subscription entitlement state server-side.
- Paystack payment initialization and verification are implemented through server-side Edge Functions.
- Wallet premium purchase uses server-side RPCs rather than raw client table writes.
- Payment remediation migrations include RLS and revoke patterns for money tables.

Risks:

- Existing payment remediation docs still mark controlled production payment testing as blocked.
- Native Kotlin does not yet include a RevenueCat Android SDK implementation.
- Paystack in native Android needs a product/legal decision because Play Billing rules may prohibit external payment for digital goods.
- Wallet and swipe-payment flows require idempotency tests before offline sync.
- No native payment screen should be marked safe until product owner and Play policy decisions are documented.

## 14. Notification findings

The handoff should distinguish three layers:

- Existing web/Capacitor notification code.
- Backend notification storage, device registry, and Edge Functions.
- New Kotlin native notification implementation.

The first two are partially implemented and evidenced. The third is not complete. The native app currently has FCM service scaffolding only; it does not yet implement the wrapper's OneSignal user login, device registration RPC call, foreground display, notification center sync, or deep-link dispatch.

Native notification implementation should be deferred until auth and profile RLS are resolved, because notification device registration ties device identity to authenticated users.

## 15. Offline and Room findings

The native offline foundation exists, but the handoff incorrectly treats proposed cache behavior as implemented behavior.

Implemented now:

- Room database setup.
- `cached_profiles`.
- `pending_writes`.
- DataStore app preferences.
- Connectivity observer.
- WorkManager scheduling foundation.
- No-op sync worker placeholder.
- Logout clearing for current implemented local state.

Not implemented now:

- Discovery-card cache.
- Conversation-list cache.
- Message cache.
- Swipe outbox with idempotent retry.
- Chat media cache.
- Payment-safe offline handling.
- Full personal-data purge across future tables.

The next implementation phase should extend Room one feature at a time, with explicit retention and purge rules for each entity.

## 16. Play Store migration findings

Verified:

- Existing wrapper application ID: `com.collegedate.app`.
- Native application ID: `com.collegedate.app`.
- Existing wrapper version visible in repository: `2.2.36`, version code `33`.
- Native Phase 1 version: `0.1.0-native-phase1`, version code `1`.
- Existing wrapper has many HTTP and custom-scheme deep links in `android/app/src/main/AndroidManifest.xml`.
- Native Phase 1 only includes auth/reset custom-scheme deep links.

Risks:

- Native version code must be greater than the current wrapper version code before it can update the same Play listing.
- Upload key availability and Play App Signing status are not proven from repository evidence.
- Deep link parity is incomplete.
- Local WebView session data will not automatically migrate into native Supabase SDK storage.
- Push token identity and notification permission behavior will change.
- Existing wrapper users may lose cached offline/web state on update.
- Feature parity is far from complete, so the native app is not ready to replace the Play production app.

## 17. Security blockers

- Profile RLS/public exposure: Phase 1.5 evidence found anonymous REST could read `profiles.id` and `profiles.is_onboarded`. This must be fixed or formally accepted before broad native profile reads.
- Confessions privacy: repository evidence shows optimized confessions may expose poster, reactor, and claimer user ids.
- Discovery feed privacy: `discovery_feed_v3` must be verified to expose only intended public profile fields to the current user.
- Swipe quota RPC grants: direct client access to user-id parameter RPCs must be verified and constrained.
- Payment readiness: controlled payment and replay/idempotency tests remain required before native payment release.
- Native notifications: device registration and notification deep links must avoid exposing private profile or message data in logs or payloads.
- Calls: temporary web-based call surfaces need security and Play review before any native release.
- Local cache purge: future Room entities require account logout/deletion purge coverage before storing sensitive data.

## 18. Screens safe to implement immediately

These screens are safe to implement now, provided they use verified Phase 1 auth contracts and do not add new backend reads:

- Splash
- Welcome
- Login
- Registration
- Password recovery
- Email verification state
- Auth callback/error state
- Logged-in shell with clearly labelled development placeholders
- Settings shell for logout only
- Offline banner, loading, empty, and error components
- Design-system components: buttons, text fields, cards, chips, badges, dialogs, bottom sheets, app bars, bottom navigation

Onboarding screens may be prototyped visually, but backend writes and completion decisions should wait for product-owner confirmation and RLS remediation.

## 19. Screens that must be deferred

Defer these screens until the listed blockers are resolved:

- Onboarding completion writes and profile-photo upload: requires exact completion contract and profile/photo RLS verification.
- Profile view/edit: requires safe profile field contract and local-cache purge rules.
- Discovery and swipe: requires safe discovery feed contract, swipe RPC grant review, and offline idempotency design.
- Matches and requests: requires match RLS and notification side-effect verification.
- Messaging: requires live message/media RLS verification and native cache strategy.
- Calls: requires native Agora implementation or approved temporary containment.
- Confessions: requires anonymous-safe backend contract.
- Premium: requires native RevenueCat implementation and entitlement verification.
- Wallet: requires payment policy and controlled payment testing.
- Referrals: requires native route and anti-abuse handling.
- Leaderboard/viewers: requires field exposure and premium gating verification.
- Push notification settings and notification center: requires native device registration implementation.
- Admin or account deletion flows: requires stricter security review.

## 20. Required corrections to the Antigravity handoff

- Replace React 18/Router v6/Tailwind claims with the current repository evidence: React 19.2.0, React Router DOM 7.13.0, Vite 7.3.1, and no Tailwind dependency in `package.json`.
- Replace native "Kotlin 2.0+ / Supabase SDK 2.x" language with actual current native versions or mark version statements as flexible.
- Correct `discovery_feed_v3` from RPC to PostgREST view/relation unless a new RPC is intentionally created later.
- Correct RPC argument names, especially referral and swipe-limit calls.
- Remove "zero blockers," "100% unblocked," and equivalent claims from backend-connected screens.
- Mark Room discovery/chat/offline swipe caches as proposed, not implemented.
- Mark native FCM/OneSignal implementation as deferred, not complete.
- Correct onboarding field inventory: current onboarding uses level, not department.
- Add explicit RLS blocker for anonymous profile reads found in Phase 1.5.
- Add explicit confessions privacy blocker for user-id exposure.
- Correct calls from generic WebRTC wording to Agora Web SDK plus `agora-call-token`.
- Mark WebView/CCT call fallback as requiring approval and security review.
- Clarify Paystack readiness and Play policy constraints.
- Clarify settings notification fields from actual profile columns or backend registry, not a single unverified `profiles.notification_settings` field.
- Split visual design intent from verified backend contracts in all implementation handoffs.

## 21. Final recommendation on whether native UI implementation may begin

Yes, but only in a narrow lane.

Native UI implementation may begin for the app shell, auth flow, design system, Android-native layouts, and non-production placeholders. That work can proceed without restructuring the Phase 1 foundation.

Native implementation should not begin for profile completion, discovery, swiping, matches, messaging, calls, confessions, premium, wallet, payments, notifications, referrals, leaderboard, viewers, or account deletion until the Antigravity handoff is corrected and the security/runtime blockers above are closed.

Phase 2 is not safe to begin as a backend-connected feature phase yet. The next safest task is a remediation pass that updates the Antigravity handoff documents, verifies live RLS for `profiles`, `discovery_feed_v3`, `matches`, `messages`, and confessions, and obtains product-owner decisions for onboarding, calls, Paystack/native payments, and confessions privacy.
