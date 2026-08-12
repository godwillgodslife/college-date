# Native Android Phase 2 Profile and Discovery Report

Date: 2026-08-12

Workspace: `C:\college-date`

Native project: `android-native/`

Package/application ID: `com.collegedate.app`

Approved staging project: `College Date Staging` / `pxobauvatbjncluuunyq` / `eu-west-1`

Production project excluded from this phase: `gedoyoleoscgxgdqszzc`

## Executive Status

Phase 2 is complete for the approved native onboarding, owner profile, photo upload, discovery, standard swipe, match-result, matched-profile, and offline-cache scope.

Two generated synthetic adult test identities completed the live flow against staging. No production account, project, migration, data, or credential was used. The native project builds, 61 unit tests pass, four connected Compose tests pass, lint has zero errors, and both debug APKs build.

The device pass found and fixed four runtime defects:

1. A `chat-media` Storage policy queried `public.matches` directly and caused unrelated profile-photo uploads to fail for authenticated users without a direct `matches` grant.
2. a Room cache emission could incorrectly leave the online discovery screen marked as offline/cache-backed.
3. offline session restoration treated a completed cached owner profile as incomplete when the remote profile refresh failed.
4. discovery needed explicit large-font and landscape constraints.

The two Storage-policy migrations were applied only to staging. Production was not touched.

## Implemented Scope

| Area | Result | Evidence |
| --- | --- | --- |
| Staging-only configuration | Passed | Build rejects placeholders and production project ref; debug UI shows `STAGING`. |
| Existing-user login | Passed | Both synthetic accounts authenticated against staging. |
| Incomplete-profile routing | Passed | New accounts routed to native onboarding. |
| Completed-profile routing | Passed | Completed account routed to Discovery after login and restore. |
| Native onboarding | Passed | Adult confirmation, curated university, academic details, interests, intent, and photo completed. |
| Owner profile | Passed | Owner profile loaded, edited, saved, and re-rendered. |
| Photo picker/upload | Passed after staging policy repair | Android photo picker used; owner-scoped photo displayed after upload. |
| Discovery | Passed | Narrow discovery RPC returned approved profile-card fields. |
| Standard Pass/Like | Passed | Button and drag gesture paths advanced the deck once. |
| Match creation | Passed | Reciprocal standard Likes produced a real staging match. |
| Match-success UI | Passed | Native dialog showed the matched identity and deferred messaging action. |
| Matched-profile view | Passed | Approved matched fields rendered through the matched-profile RPC. |
| Session restoration | Passed | Force-stop/reopen restored the session and completed route. |
| Logout | Passed | Returned to Welcome and did not expose the prior account to the next login. |
| Offline launch/cache | Passed after Android fixes | Session and cached discovery card restored with a real Offline banner. |
| Reconnect | Passed after Android fixes | Validated transport cleared banners and automatically refreshed remote discovery. |
| Offline swipe failure | Passed | Error was visible and redacted; card remained in place. |
| Retry after reconnect | Passed | Same action succeeded and advanced the deck. |
| Large font | Passed | Discovery verified at font scale `1.3`. |
| Rotation | Passed after layout fix | Compact landscape keeps identity, campus detail, and both actions visible. |
| WebView absence | Passed | Native Compose screens; prior device check reported `WebViews: 0`. |

## Backend Contracts

| Contract | Purpose | Native behavior |
| --- | --- | --- |
| `get_current_profile()` | Authenticated owner profile | No broad `profiles` read. |
| `update_current_profile(p_profile jsonb)` | Approved owner edits/onboarding | Mapper emits only approved editable fields. |
| `profile-photos` Storage bucket | Owner photo upload | Object path is scoped to the authenticated owner. |
| `get_discovery_profiles(...)` | Discovery projection | No direct view or broad profile query. |
| `record_profile_swipe(...)` | Standard Pass/Like and match result | Uses `standard`; paid swipe paths remain deferred. |
| `get_matched_profile(uuid)` | Matched-profile projection | No broad profile fallback. |

The client does not call `discovery_feed_v3`, `leaderboard_unified`, or `optimized_confessions` directly.

## Staging Repair

### Root Cause

The two permissive `storage.objects` policies for the `chat-media` bucket embedded direct subqueries against `public.matches`. Authenticated mobile clients intentionally have no direct `matches` table grant. PostgreSQL could evaluate the permissive chat policy while authorizing an unrelated `profile-photos` insert, causing `permission denied for table matches`.

This was a Storage policy isolation defect, not a profile-photo path or Android credential defect.

### Applied Staging Migrations

| Local migration | Applied staging migration | Result |
| --- | --- | --- |
| `20260810123000_isolate_chat_media_match_policy.sql` | `isolate_chat_media_match_policy` | Replaced direct policy queries with an authenticated match-membership predicate. |
| `20260812193000_move_chat_media_access_helper_private.sql` | `move_chat_media_access_helper_private` | Moved the privileged predicate out of exposed `public` RPC space. |

Final helper state:

- Schema: `private`
- Name: `can_access_match_media(text)`
- `SECURITY DEFINER`: yes
- `search_path`: empty
- Anonymous execute: no
- Authenticated execute: yes, for Storage policy evaluation
- Public-schema version: removed
- Storage policies: authenticated-only and scoped to `chat-media/matches/{match-id}/...`

The second migration was prompted by the security advisor correctly flagging the first public helper as directly RPC-callable. After the move, that specific advisor warning disappeared.

No Storage object, profile row, match row, or production object was modified by these DDL migrations.

## RLS And Security

- The prior staging Auth/RLS matrix remains 69/69 passed with zero failures.
- Live Phase 2 verified owner profile access, narrow discovery projection, standard swipe/match creation, and matched-profile access using authenticated staging sessions.
- The native app did not use service-role access.
- No private matched-profile field appeared in the UI semantics tree during the live matched-profile check.
- The profile payload mapper excludes Premium, wallet, referral reward, moderation, admin, ownership, notification, and AI-review fields.
- Public configuration remains in ignored `android-native/local.properties`; the tracked example contains placeholders only.
- `local.properties` and `android-native/captures/` are confirmed ignored.
- Passwords, access tokens, refresh tokens, bearer headers, Supabase keys, and full auth responses are not emitted by app-owned logging.
- Synthetic credentials were held only in task memory and were not written to a workspace file or documentation.

Remaining staging-wide advisor items are not regressions from the Phase 2 repair:

- Informational `RLS enabled, no policy` notices on deny-by-default/deferred tables.
- Review notices for existing app-facing `SECURITY DEFINER` RPCs, including approved Phase 2 RPCs and deferred features.
- Anonymous execution review for `validate_referral_code`, deferred with referrals.
- Leaked-password protection is disabled in staging Auth and should be enabled before production Auth rollout.

## Offline Behavior

Owner profile cache is identity-scoped by authenticated user ID. A cached owner profile is used only for an `IOException` remote failure; authorization and unknown failures still fail closed. Another user's cached row cannot complete routing.

Discovery behavior:

- Room renders cached cards immediately.
- A fresh remote response clears cache-backed presentation state.
- `onLost` produces `Unavailable` without re-reading the transitioning active network.
- Reconnection requires Android `INTERNET` plus `VALIDATED` capabilities.
- A transition from offline cached data to validated connectivity triggers one automatic refresh.
- A failed offline swipe keeps the current card and releases the single-action lock.
- Successful swipe invalidates the card from the local discovery cache.
- Logout clears owner profile and discovery cache.

## Automated Verification

Final unit results:

| Metric | Result |
| --- | ---: |
| Suites | 13 |
| Tests | 61 |
| Failures | 0 |
| Errors | 0 |
| Skipped | 0 |

Coverage includes configuration guards, auth routing, login errors, session restoration, logout/cache clearing, sensitive-data redaction, profile validation/mapping, identity-scoped offline profile fallback, discovery cache behavior, connectivity transitions, reconnect refresh, standard swipe success/failure, action lock, and match result state.

Connected Compose results:

| Device | Tests | Failures | Errors | Skipped |
| --- | ---: | ---: | ---: | ---: |
| Pixel 4a AVD / Android 17 API 37 | 4 | 0 | 0 | 0 |

## Build Verification

| Command | Result |
| --- | --- |
| `.\gradlew.bat clean build --console=plain --no-daemon` | Passed in 12m 29s |
| `:app:compileDebugKotlin` | Passed |
| `:app:testDebugUnitTest` | Passed, 61/61 |
| `:app:lintDebug` | Passed, 0 errors and 22 warnings |
| `:app:assembleDebug` | Passed |
| `:app:assembleDebugAndroidTest` | Passed |
| `:app:connectedDebugAndroidTest` | Passed in 1m 49s, 4/4 |

Generated artifacts:

- `android-native/app/build/outputs/apk/debug/app-debug.apk`
- `android-native/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk`

Lint warnings are dependency update notices, two existing Compose modifier-order notices, and the Room KAPT-to-KSP recommendation. There are no lint errors.

## Emulator Verification

Primary evidence device:

- AVD: Pixel 4a
- Serial during final connected run: `emulator-5556`
- Android: API 37 / Android 17, x86_64, 16 KB page size
- Display: 1080 x 2340 at 440 dpi
- Package: `com.collegedate.app.debug`

Pixel 4 and Pixel 4a were initially launched together. The combined API-37 memory load caused Android System UI ANRs on the host laptop, not College Date crash traces. Verification therefore continued as a sequential two-account relay on Pixel 4a. Pixel 4 results are not claimed as final device evidence.

Android's emulator transport initially remained `CAPTIVE_PORTAL` after reconnect even though the host could reach staging. The test disabled captive-portal checking only for the AVD, validated the callback, and restored the setting afterward. Final AVD settings were returned to font scale `1.0`, portrait rotation, and default captive-portal behavior.

## Screenshots

Non-personal synthetic screenshots and UI trees are stored in the ignored directory:

`android-native/captures/phase2-two-device/`

Key evidence:

- `pixel4a-offline-route-postfix.png`
- `pixel4a-autoretry-online.png`
- `pixel4a-offline-swipe-error.png`
- `pixel4a-large-font-final.png`
- `pixel4a-landscape-large-font-fixed.png`

The captures are intentionally not committed and contain no real user identity or credential.

## Files Created

Primary Phase 2 additions are grouped below; generated build outputs and ignored captures are excluded.

- Discovery domain, repository, Supabase data source, Compose screen, ViewModel, and tests under `android-native/app/src/.../discovery/`.
- Matching domain, repository, Supabase data source, matched-profile screen/ViewModel, and tests under `android-native/app/src/.../matching/` and `feature/matches/`.
- Native onboarding screen/ViewModel and profile screens/ViewModel.
- Profile payload mapper, card DTO, validators, university catalog, and tests.
- Room discovery DAO/entity and expanded design-system components.
- `ConnectivityObserverTest.kt` and connected `OfflineComponentTest.kt`.
- `supabase/migrations/20260810123000_isolate_chat_media_match_policy.sql`.
- `supabase/migrations/20260812193000_move_chat_media_access_helper_private.sql`.
- This report.

## Files Modified

Existing Phase 1 native files were modified only inside `android-native/` for build configuration, DI, Room schema, owner profile/cache behavior, auth routing, navigation, design-system responsiveness, and tests. The principal files include:

- `android-native/app/build.gradle.kts`
- `android-native/app/src/main/java/com/collegedate/app/app/CollegeDateApp.kt`
- `android-native/app/src/main/java/com/collegedate/app/app/di/AppModule.kt`
- `android-native/app/src/main/java/com/collegedate/app/core/database/CollegeDateDatabase.kt`
- `android-native/app/src/main/java/com/collegedate/app/core/database/dao/CachedProfileDao.kt`
- `android-native/app/src/main/java/com/collegedate/app/core/network/ConnectivityObserver.kt`
- `android-native/app/src/main/java/com/collegedate/app/data/auth/AuthRepositoryImpl.kt`
- `android-native/app/src/main/java/com/collegedate/app/data/profile/ProfileRepositoryImpl.kt`
- `android-native/app/src/main/java/com/collegedate/app/feature/discovery/DiscoveryScreen.kt`
- `android-native/app/src/main/java/com/collegedate/app/feature/discovery/DiscoveryViewModel.kt`
- associated native unit and Android tests
- `android-native/local.properties.example`

No existing web or Capacitor file was intentionally modified by this Phase 2 work. The worktree contains unrelated pre-existing changes outside `android-native/`, `docs/native-android/`, and the two listed staging migration files; they were left untouched.

## Known Limitations

- Profile-photo removal updates the profile payload but does not delete the Storage object in Phase 2.
- Upload progress is a determinate UI operation state, not byte-level transfer telemetry.
- Missing-profile bootstrap relies on the confirmed existing Auth/profile contract; no new client-side table contract was invented.
- Non-match and blocked-target denials were not navigated manually from the app because there is no arbitrary target route. They remain covered by the verified 69/69 staging security matrix and the narrow RPC contract.
- Token refresh was exercised through normal SDK session restoration, but an intentionally expired access token was not forced on-device.
- A physical-device pass remains recommended before external testing; final automated and live evidence is emulator-based.
- Synthetic staging accounts and their match remain for reproducible QA cleanup; no production users were created.

## Deferred Features

Messaging, push, Premium, wallet, payments, Super Swipe, boosts, calls, confessions, referrals, leaderboard, account deletion, and admin/moderation remain outside Phase 2.

## Phase 3 Readiness

Phase 2's native profile/discovery foundation is ready for product-owner acceptance and a small logical commit series. Phase 3 may begin after those commits, starting with a narrow messaging data-contract and RLS review. Monetization and notification work should remain separate.

Before release rather than before Phase 3 development:

1. Run the same acceptance flow on at least one physical Android device.
2. Enable leaked-password protection in the intended Auth environment.
3. Review existing staging-wide `SECURITY DEFINER` advisor notices by feature ownership.
4. Decide and implement Storage object deletion semantics for removed profile photos.
5. Remove the synthetic staging QA identities when reproducible testing is no longer needed.
