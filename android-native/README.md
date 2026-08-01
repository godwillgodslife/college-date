# The College Date Native Android

This folder contains the phase-1 Kotlin and Jetpack Compose native Android foundation for The College Date.

The existing React/Vite/Capacitor web application remains in place under the repository root and `android/`. This project does not use WebView for primary screens.

## Project Shape

- Application ID: `com.collegedate.app`
- Debug application ID: `com.collegedate.app.debug`
- Minimum SDK: 24
- Compile SDK: 36
- Target SDK: 36
- Architecture: single-module MVVM with package boundaries for `core`, `data`, `domain`, and `feature`
- UI: Jetpack Compose + Material 3
- Auth: Supabase Kotlin client using public URL/anon key only

## Public Configuration

The project intentionally does not commit Supabase keys. Configure the anon/publishable key outside source control:

```properties
COLLEGE_DATE_SUPABASE_ANON_KEY=your-public-anon-or-publishable-key
```

You can set it in `~/.gradle/gradle.properties` or as an environment variable.

## Local Build

```powershell
cd C:\college-date\android-native
.\gradlew.bat :app:compileDebugKotlin
.\gradlew.bat :app:testDebugUnitTest
.\gradlew.bat :app:lintDebug
.\gradlew.bat :app:assembleDebug
```

`local.properties` is ignored and points this workstation at a clean SDK overlay because the installed API 36 platform folders are mislabeled in the default Android SDK.

## Implemented In Phase 1

- Native app shell and Hilt dependency graph
- Compose Material 3 theme and reusable auth/state components
- Auth routes for welcome, login, registration, password recovery, email verification, onboarding placeholder, and authenticated main shell
- Supabase email/password login, registration, password reset request, session restoration, auth-state observation, and logout
- Profile onboarding-state lookup from the existing `profiles` table
- Room, DataStore, WorkManager, connectivity, pending-write, and notification foundations
- JVM tests for routing, validation, repository behavior, session restore/logout, and ViewModel state
- Compose instrumentation test source that compiles when no emulator is attached

## Not Implemented In Phase 1

Discovery, swiping, messaging, wallet, referrals, premium purchase flows, payment logic, native push registration, and account deletion are intentionally deferred.
