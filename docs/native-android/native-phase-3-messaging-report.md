# Native Android Phase 3 Text Messaging Report

Date: 2026-08-13

Workspace: `C:\college-date`

Native project: `android-native/`

Package/application ID: `com.collegedate.app`

Approved staging project: `College Date Staging` / `pxobauvatbjncluuunyq` / `eu-west-1`

Production project excluded: `gedoyoleoscgxgdqszzc`

## Executive Status

The bounded native text-messaging implementation is code-complete and staging schema security is verified. The Android project compiles, 68 unit tests pass, lint has zero errors, debug and Android-test APKs build, and all four connected tests pass on the Pixel 4a AVD.

The authenticated live messaging matrix is not complete. Staging Auth returned `429 over_request_rate_limit` while restoring the approved synthetic QA path, after earlier disposable signup attempts also reached the email/request limit. No Auth setting was weakened, no service-role credential was used, and no user was created or deleted to bypass the limit. Consequently, authenticated inbox/history/send/receive/read/session-restoration/logout scenarios are recorded as blocked rather than passed.

Phase 3 must remain in staging acceptance until the Auth rate-limit window clears and the two-account runtime matrix below is executed. Production promotion is not recommended yet.

## Implemented Scope

| Area | Result | Evidence |
| --- | --- | --- |
| Native inbox | Implemented | Room-backed list, approved avatar/name projection, unread badge, loading/empty/error/offline states. |
| Native chat | Implemented | History, text composer, 2,000-character limit, send lock, read state, keyboard/inset handling. |
| Text sending | Implemented | RPC-only mutation with UUID client nonce and idempotent retry. |
| Realtime | Implemented | Match-filtered `INSERT`/`UPDATE` channel; cleanup on close/offline. |
| Read receipts | Implemented | Participant RPC updates only other-sender unread messages. |
| Offline cache | Implemented | Owner-scoped conversation/message Room tables; cached reads; no offline writes. |
| Session cleanup | Implemented and unit-tested | Logout and session loss clear profile plus messaging cache. |
| Navigation | Implemented | Inbox is a main destination; chat is a nested typed destination with correct back behavior. |
| Matched avatar | Fixed during review | Inbox now renders the approved avatar URL through Coil with a generic fallback. |
| Attachments/calls/push | Deferred | No contract or UI is presented as complete. |

## Backend Contract

The durable contract is documented in `docs/native-android/native-messaging-contract.md`.

The client uses only:

- `get_native_conversations(integer, integer)`
- `get_native_messages(uuid, timestamptz, integer)`
- `send_native_text_message(uuid, text, text)`
- `mark_native_messages_read(uuid)`
- participant-scoped Realtime `messages` events for the open match

It does not directly read `matches`, `conversations`, or profiles for messaging, and it has no direct message write grant.

## Staging Changes

The following migrations were applied only to `pxobauvatbjncluuunyq`:

| Local migration | Connected migration name | Purpose |
| --- | --- | --- |
| `20260813103000_native_text_messaging_contract.sql` | `native_text_messaging_contract` | RPCs, idempotency index, participant message policy, grants. |
| `20260813111500_allow_participant_message_realtime_payload.sql` | `allow_participant_message_realtime_payload` | Stable Realtime row payload while keeping writes RPC-only. |
| `20260813114500_align_native_messaging_report_privacy.sql` | `align_native_messaging_report_privacy` | Disables chat after any non-dismissed report in either direction. |
| `20260813130000_harden_native_message_idempotency_race.sql` | `harden_native_message_idempotency_race` | Makes concurrent same-nonce retries return the winning insert. |

Production was not accessed or modified during this phase.

## RLS And Grant Verification

Final staging metadata:

- `public.messages` RLS: enabled
- message policies: one authenticated `SELECT` policy
- policy predicate: participant, no non-dismissed mutual report, and message not expired
- authenticated table privilege: `SELECT`
- authenticated direct write privileges: none
- anon/PUBLIC table privileges: none
- `messages` in `supabase_realtime`: yes
- nonce unique index: present
- all five messaging helper/RPC functions: `SECURITY DEFINER`, empty `search_path`
- anonymous/PUBLIC execute on those functions: none
- authenticated execute: yes

Public-key HTTP probes returned `401` for all four RPCs without a user session. No message or profile rows were selected or printed during metadata verification.

The security advisor still reports pre-existing staging-wide notices, including deny-by-default tables with no policy, app-facing `SECURITY DEFINER` functions, and leaked-password protection disabled. The new public messaging RPCs appear in the expected definer-function review category; their grants and pinned search paths were inspected directly. The performance advisor remains dominated by pre-existing unused-index and RLS optimization notices. No advisor-driven production write was made.

## Automated Verification

Final unit results:

| Metric | Result |
| --- | ---: |
| Suites | 15 |
| Tests | 69 |
| Failures | 0 |
| Errors | 0 |
| Skipped | 0 |

Messaging coverage includes repository success/network/cache behavior, send and Realtime caching, local clearing, chat load, local validation, send success, send failure with retained draft and nonce, duplicate-send lock, offline send rejection, Realtime receipt handling, read updates, and offline state.

Existing auth tests now also verify messaging cache clearing during logout. No automated test depends on a live account, production credential, or permanent token.

Connected results:

| Device | Tests | Failures | Errors | Skipped |
| --- | ---: | ---: | ---: | ---: |
| Pixel 4a AVD / Android 17 API 37 | 4 | 0 | 0 | 0 |

## Build Verification

| Command | Result |
| --- | --- |
| `:app:compileDebugKotlin` | Passed after final avatar review fix. |
| `:app:testDebugUnitTest` | Passed, 69/69 after final offline-send guard. |
| `:app:lintDebug` | Passed, 0 errors and 23 warnings. |
| `:app:assembleDebug` | Passed. |
| `:app:assembleDebugAndroidTest` | Passed. |
| `:app:assembleDebugAndroidTest :app:connectedDebugAndroidTest` | Passed in 3m 41s, 4/4. |
| `.\gradlew.bat clean build --console=plain --no-daemon` | Passed in 14m 41s. |

Lint warnings are dependency update notices, two existing Compose modifier-order notices, and the KAPT-to-KSP recommendation. They are warnings, not failures.

## Pixel 4a Verification

Evidence device:

- AVD: Pixel 4a
- Serial: `emulator-5554`
- Android: API 37 / Android 17
- Display: 1080 x 2340 at 440 dpi
- Package: `com.collegedate.app.debug`

Passed on-device:

- cold native launch without crash
- no-session routing to Welcome
- Login rendering and staging indicator
- status/navigation-bar insets and no horizontal overflow
- keyboard display/dismissal and form visibility
- invalid-email validation without a network call
- offline login error with form contents retained
- reconnection to emulator network
- Android Back from Login to Welcome and from Welcome to launcher
- no WebView or browser zoom behavior
- app-owned log scan showed no password, access token, refresh token, Supabase key, or full Auth response
- four connected Compose/instrumentation tests

Screenshots and UI trees are stored under the ignored path `android-native/captures/phase3-messaging/`. They contain only logged-out synthetic input and are not committed.

## Blocked Live Scenarios

The following require an authenticated staging session and are not claimed as passed in this run:

- inbox remote load
- history remote load
- participant text send
- idempotent live retry
- Realtime receive from the second participant
- read receipt propagation
- force-close authenticated session restoration
- authenticated offline cached inbox/chat
- logout after messaging and post-logout cache inspection
- reported/non-participant denial through a real user session
- two-device simultaneous conversation flow

Exact blocker: staging Auth returned HTTP `429` with `over_request_rate_limit` for the previously approved synthetic account. Earlier attempts to create fresh disposable addresses also hit validation/email-send limits. The database and Android app remained reachable; this is an Auth quota/rate-window blocker, not a build or RLS metadata failure.

## Exact Remaining Acceptance Steps

After the staging Auth rate-limit window clears:

1. Start Pixel 4a and Pixel 4 sequentially, or simultaneously only if host memory remains stable.
2. Sign in with two approved synthetic, confirmed staging accounts that have one mutual match and no active report.
3. Verify each account sees only its permitted conversation.
4. Send A-to-B, confirm exactly one row/event and immediate B delivery.
5. Retry one deliberately interrupted send with the same draft and confirm no duplicate.
6. Open on B and confirm read state propagates to A.
7. Force-stop/reopen both apps and confirm session plus cached history restoration.
8. Disable network, reopen chat, confirm cached history and disabled send; restore network and confirm Realtime reconnect.
9. Logout, reopen, and confirm Welcome plus no prior identity's cached conversation.
10. Add a synthetic non-dismissed report between the pair only through the approved staging fixture process, confirm inbox omission and RPC denial, then clean up the synthetic fixture through an approved process.

Do not use production users or service-role credentials for this acceptance pass.

## Files Created

- Messaging domain models under `android-native/app/src/main/java/com/collegedate/app/domain/messaging/`.
- Messaging repository, remote source, and Supabase implementation under `android-native/app/src/main/java/com/collegedate/app/data/messaging/`.
- Inbox/chat screens and ViewModels under `android-native/app/src/main/java/com/collegedate/app/feature/messages/`.
- Room message/conversation entities and DAOs.
- Messaging repository and ViewModel unit tests.
- Four staging messaging migrations listed above.
- `docs/native-android/native-messaging-contract.md`.
- This report.

## Files Modified

Only native foundation files were intentionally modified:

- native dependency injection
- Room database version/schema
- native routes and main shell
- auth cache cleanup and its test
- shared native avatar component
- existing messaging repository placeholder

No existing web or Capacitor source file was intentionally modified. Numerous unrelated pre-existing worktree files outside this scope remain untouched and uncommitted.

## Deferred Features

Media attachments, voice notes, stickers, gifts, typing indicators, online presence, push notifications, Android notification channels, calls, reactions, message edits/deletion, moderation UI, conversation search, and offline write synchronization remain deferred.

One cache-hardening follow-up is also recorded: remote refresh currently clears and then upserts Room rows in separate DAO calls. A later patch should wrap each replace operation in one Room transaction so process cancellation cannot briefly leave a successfully refreshed cache empty. This does not affect server data or the current retry security contract.

## Phase Verdict

The native implementation and staging security contract are ready for the final two-account staging acceptance pass. Phase 3 is not fully complete and the next feature phase is not safe to begin until the blocked authenticated matrix passes. No production promotion or Phase 4 work should start from this report.
