# Phase 1.5 Auth Verification Report

Date: 2026-08-01

## Status

Phase 1.5 code-level integration is complete and builds successfully. Public Supabase configuration is loaded from ignored local configuration and exposed to the native app through `BuildConfig`.

Live device authentication was not completed because no Android device/emulator was attached and no approved test-account credentials were available. The public Supabase URL and anon/publishable key were provided, but no password-bearing approved test account was provided.

Do not begin Phase 2 feature development until the remaining live auth and RLS blockers are closed.

## Configuration

Implemented:

- `android-native/local.properties.example` documents credential-free local setup.
- `android-native/local.properties` is ignored by Git and contains the local public Supabase configuration for this workstation.
- Gradle accepts these public config names, in priority order:
  - `SUPABASE_URL`
  - `COLLEGE_DATE_SUPABASE_URL`
  - `VITE_SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `COLLEGE_DATE_SUPABASE_ANON_KEY`
  - `VITE_SUPABASE_ANON_KEY`
- Existing repository-root `.env` can be used as a local ignored source, but only the public Supabase names are read.
- Release builds fail if no anon/publishable key is configured.

Confirmed:

- No Supabase credentials are hard-coded in Kotlin files.
- `BuildConfig` is generated under ignored build output.
- `android-native/local.properties` is ignored by `android-native/.gitignore`.
- Service-role keys are not used.
- Build logs did not print the configured Supabase URL/key values.

## Auth Fixes

- Fixed auth-state observation in `AuthRepositoryImpl`: authenticated Supabase session-status events now hydrate and assign the resulting `AuthState`.
- Tightened auth-driven back-stack replacement in `CollegeDateNavHost`, so login/logout route changes clear the previous stack.
- Added `SensitiveDataRedactor` and `PrivacyLog` for redacted debug logging.
- Updated missing-config UI copy to avoid referencing only the old `COLLEGE_DATE_*` name.

## Automated Verification

Passed through JVM tests:

- Supabase configuration availability.
- No-session routing.
- Existing-session routing.
- Incomplete-profile routing.
- Completed-profile routing.
- Email-verification routing.
- Login success.
- Login invalid-credential failure.
- Login network failure.
- Logout.
- Session clearing.
- Session restoration.
- Auth-state observation.
- Password-reset request state.
- Registration state.
- Sensitive-data redaction from logs.

The tests use fakes and do not depend on production credentials or permanent production user accounts.

## Requested Auth Scenario Matrix

| Scenario | Result | Evidence |
|---|---|---|
| Cold application launch | Not run on device | No attached Android target |
| No-session routing | Passed in automated tests | `AuthRouteDeciderTest` |
| Existing-user login | Not live-tested | No approved test-account password/device |
| Invalid email validation | Passed in automated tests | `AuthViewModelTest` |
| Invalid password handling | Passed in automated tests | `AuthViewModelTest` blank-password path |
| Incorrect-credential handling | Passed in automated tests | `AuthRepositoryImplTest` |
| Network-error handling | Passed in automated tests | `AuthRepositoryImplTest`, `AuthViewModelTest` |
| Successful session creation | Passed with fakes, not live-tested | `AuthRepositoryImplTest` |
| Routing after successful login | Passed in automated tests | `AuthRouteDeciderTest`, `AuthViewModelTest` |
| Application force-close | Not run on device | No attached Android target |
| Session restoration after reopening | Passed with fakes, not live-tested | `AuthRepositoryImplTest` |
| Access-token refresh behavior | Not live-tested | Requires real session/device |
| Logout | Passed with fakes, not live-tested | `AuthRepositoryImplTest`, `AuthViewModelTest` |
| Local session clearing after logout | Passed in automated tests | `AuthRepositoryImplTest` |
| Back-button behavior after login | Code fix implemented, not device-tested | `CollegeDateNavHost` stack replacement |
| Back-button behavior after logout | Code fix implemented, not device-tested | `CollegeDateNavHost` stack replacement |
| Registration with approved test account | Not performed | No explicit approval/test account |
| Email-verification state | Passed with fake unverified signup | `AuthRepositoryImplTest` |
| Password-reset request | Passed with fakes, not live-tested | `AuthRepositoryImplTest`, `AuthViewModelTest` |
| Password-reset deep-link handling | Code present, not device-tested | Manifest + `MainActivity` |
| First-run onboarding routing | Passed in automated tests | `AuthRouteDeciderTest` |
| Returning-user routing | Passed in automated tests | `AuthRouteDeciderTest` |
| Account with incomplete profile routing | Passed in automated tests | `AuthRepositoryImplTest` |
| Account with completed profile routing | Passed in automated tests | `AuthRepositoryImplTest` |

## Onboarding Contract

Current repository evidence still supports `profiles.is_onboarded` as the onboarding-completion contract:

- Existing web auth/profile hydration uses `profiles`.
- Existing native Phase 1 reads only `profiles.id`, `profiles.name`, `profiles.username`, `profiles.avatar_url`, and `profiles.is_onboarded`.
- Phase 1.5 did not invent new profile-completion columns or RPCs.

## Device Verification

Command:

```powershell
C:\Users\DELL\AppData\Local\Android\Sdk-codex-clean\platform-tools\adb.exe devices
```

Result:

- ADB started successfully.
- No device or emulator was listed.

Not performed:

- Splash screen.
- Welcome/login rendering.
- Insets.
- Keyboard opening/dismissal.
- Form scrolling with keyboard.
- Loading indicators.
- Error messages on device.
- Successful login.
- Force-close/reopen.
- Session restoration.
- Logout.
- Android back navigation.
- Offline launch and offline login attempt.
- Reconnection.
- Horizontal overflow.
- WebView/zoom checks.
- Accessibility touch targets.
- Dark mode.
- Screenshots.

No screenshots were captured because no Android target was available.

## Build Verification

| Command | Result |
|---|---|
| `.\gradlew.bat clean build --console=plain` | Passed |
| `.\gradlew.bat :app:compileDebugKotlin --console=plain` | Passed |
| `.\gradlew.bat :app:testDebugUnitTest --console=plain` | Passed |
| `.\gradlew.bat :app:lintDebug --console=plain` | Passed: 0 errors, 19 warnings |
| `.\gradlew.bat :app:assembleDebug --console=plain` | Passed |
| `.\gradlew.bat :app:assembleDebugAndroidTest --console=plain` | Passed |

Warnings:

- Newer dependency versions are available. The project remains pinned to the compatible AGP 8/Kotlin 2.3/Supabase 3.6/Hilt 2.58 set from Phase 1.
- KAPT/KSP performance warning for Room.
- Kotlin warnings for deprecated system-bar APIs, Hilt Compose import move, Firebase token override, and Kotlin annotation-target behavior.
- Native-library strip warnings for packaged native libraries.

Artifacts:

- Debug APK: `C:\college-date\android-native\app\build\outputs\apk\debug\app-debug.apk`
- Android test APK is generated by `assembleDebugAndroidTest`; no connected target was available to run it.

## Privacy Review

Confirmed:

- No `Log.d`, `println`, or stacktrace logging of auth responses exists in auth code.
- Passwords are passed only into the Supabase SDK call and cleared from UI state after successful login/registration.
- Auth failure mapping returns safe generic messages for invalid credentials and network errors.
- `PrivacyLog` logs only in debug builds and redacts passwords, access tokens, refresh tokens, anon keys, API keys, and JWT-shaped strings.
- Static secret scan found no token-like secrets in `android-native/` or `docs/native-android/` when build output and ignored local files were excluded.

## Existing App Integrity

This Phase 1.5 pass modified only `android-native/` files and added the requested `docs/native-android/` reports. The existing web/Capacitor app remains dirty from unrelated work already present in the worktree, but it was not edited by this pass.

## Blockers

- No Android device/emulator attached.
- No approved test-account credentials for live login, live registration, live password reset, token refresh, session restoration, or logout.
- Supabase plugin is installed but not connected to a Supabase account, so live policy metadata could not be inspected through the connector.
- Anonymous REST probing shows public access to at least minimal `profiles` columns; see `rls-verification-report.md`.

## Remaining Manual Steps

1. Connect an emulator or physical test device.
2. Provide an approved existing test account and password.
3. Install the debug build.
4. Run the full device matrix from this report.
5. Capture logged-out, login form, auth error, logged-in destination, and offline-state screenshots without personal information.
6. Connect Supabase plugin access or run the RLS SQL checks in `rls-verification-report.md`.
7. Resolve the anonymous `profiles` exposure before native profile/discovery work.

## Phase 2 Readiness

Phase 2 is not safe to begin yet.

The native foundation builds and automated auth tests pass, but live authentication, session restoration, logout, device behavior, and RLS boundaries are not fully verified.
