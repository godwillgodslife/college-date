# Architecture Decision Record

Date: 2026-08-01

## Decision

Create a new single-module native Android project in `android-native/` with clear package boundaries instead of introducing multiple Gradle modules in phase 1.

## Context

The current Android app is a Capacitor wrapper around the existing React/Vite web app. The web app must remain operational throughout the migration. Phase 1 needs a buildable native foundation with authentication, session persistence, navigation, design-system primitives, offline architecture, and documentation, but must not migrate discovery, swiping, messaging, wallet, or payments yet.

## Chosen Stack

- Kotlin
- Jetpack Compose
- Material 3
- Gradle Kotlin DSL
- MVVM
- Repository pattern
- Unidirectional state from repositories to ViewModels to Compose screens
- Coroutines and StateFlow
- Hilt dependency injection
- Navigation Compose
- Supabase Kotlin client
- Room
- DataStore
- WorkManager
- Coil
- Firebase Cloud Messaging
- JUnit and Compose UI testing
- MockK dependency available for future tests

## SDK And Toolchain

- Application ID: `com.collegedate.app`
- Debug suffix: `.debug`
- Minimum SDK: 24, matching the existing wrapper and supporting the target user base.
- Compile SDK: 36, matching the existing Android wrapper.
- Target SDK: 36, matching the existing Android wrapper.
- AGP: 8.13.2
- Kotlin: 2.3.21
- Supabase Kotlin BOM: 3.6.0
- Hilt: 2.58

Official current releases were checked through Android/Google Maven/Supabase sources. The latest Supabase `3.7.0` requires Kotlin `2.4.0`; the Hilt compiler versions that support Kotlin 2.4 require newer AGP internals, and the local machine does not have a usable Gradle 9 distribution. Therefore the project intentionally pins the newest compatible Kotlin 2.3/Supabase/Hilt set that builds on the available AGP 8.13 toolchain. Lint reports newer-version warnings, and those are expected until the native project can move to AGP 9/Gradle 9.

Reference sources checked:

- Android Gradle Plugin releases: https://developer.android.com/build/releases/gradle-plugin
- AndroidX stable releases: https://developer.android.com/jetpack/androidx/versions/stable-channel
- Supabase Kotlin install/init/auth docs: https://supabase.com/docs/reference/kotlin/installing and https://supabase.com/docs/reference/kotlin/initializing
- Supabase Kotlin GitHub: https://github.com/supabase-community/supabase-kt

## Package Structure

The app module uses:

- `app`: Application, activity, app-level DI, app shell
- `core.common`: shared result and dispatcher types
- `core.designsystem`: Compose theme and reusable components
- `core.navigation`: type-safe route objects and routing decisions
- `core.network`: Supabase client and connectivity observation
- `core.database`: Room database, cache, and pending-write entities
- `core.datastore`: DataStore-backed session preferences
- `core.notifications`: FCM service placeholder
- `core.offline`: sync state, pending writes, WorkManager scheduler/worker
- `data.auth`, `data.profile`: Supabase data sources and repositories
- `data.discovery`, `data.matching`, `data.messaging`, `data.premium`, `data.wallet`, `data.referral`, `data.settings`: future repository boundaries
- `domain`: auth/profile models and repository contracts
- `feature`: splash, auth, onboarding, main shell, settings, and placeholders

## Security Decisions

- No service-role key, payment secret, webhook secret, signing key, or service-account JSON is committed or referenced in source.
- `BuildConfig` contains public configuration only.
- Supabase anon/publishable key is read from Gradle property or environment variable and left blank in committed files.
- Native phase 1 only reads `profiles` onboarding state after authentication.
- Broader table access is blocked from implementation until RLS is reconfirmed.
- Account deletion is not implemented; when added, it must clear local caches and use a reviewed secure server endpoint.

## Offline Decisions

Room exists for cache and pending-write records, but no feature-specific offline sync is presented as complete. DataStore stores only lightweight session preference state, not passwords or payment data. WorkManager is scaffolded for connected retries.

## Consequences

Single-module architecture keeps Android Studio import and Gradle builds simple while the migration surface is small. The package boundaries leave a straightforward route to split modules later if build times or ownership require it.

The dependency pins trade newest-version cosmetics for a working, compatible build. A later infrastructure task should upgrade the native wrapper to Gradle 9/AGP 9, then move Kotlin, Supabase, Lifecycle, Hilt Navigation, and Compose to the latest stable line together.
