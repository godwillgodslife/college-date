# The College Date Native Android Prototype

This is an isolated Kotlin/Jetpack Compose prototype. It must not replace the existing Capacitor Android app until it reaches verified feature parity.

## Current Production Android Path

The production Android app still lives in:

```text
../android
```

Current production package:

```text
com.collegedate.app
```

This prototype intentionally uses:

```text
com.collegedate.prototype
```

That keeps test installs separate from the live/internal-test Android package.

## Build From Repository Root

Use the existing Gradle wrapper from the Capacitor Android project:

```powershell
cd android
.\gradlew.bat -p ..\native-android-prototype :app:assembleDebug
```

## Safety Rules

- Do not commit secrets.
- Do not use production signing from this prototype until release approval.
- Do not change Supabase production policies from this prototype.
- Do not change the live Android package until migration is approved.
- Keep RevenueCat, Supabase, Paystack, chat, matching, and auth contracts compatible with the current app.

## Next Engineering Steps

1. Add configuration loading for Supabase and RevenueCat public keys without committing private values.
2. Add Supabase Auth session handling.
3. Add login/signup screens.
4. Add dashboard and profile state loading.
5. Add match discovery and swipe RPC integration.
6. Add RevenueCat offerings, purchase, and restore.
7. Add chat conversations, realtime messages, and signed media URL handling.
8. Run physical-device QA before considering Google Play testing.
