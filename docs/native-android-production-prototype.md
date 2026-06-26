# Native Android Production Prototype Plan

## Decision

Do not replace the current Capacitor Android app yet. Build a separate Kotlin/Jetpack Compose prototype beside the existing app, then compare it against the current production Android path.

The current Android app remains the release-safe path until the native prototype reaches verified feature parity.

## Non-Negotiable Safety Rules

- Keep the existing React/Vite/Capacitor app intact.
- Do not change the Android package name `com.collegedate.app` in production release work.
- Do not remove Supabase Auth, Supabase Realtime, Supabase Storage, RevenueCat, Paystack web payments, OneSignal/Firebase push guards, or existing Edge Function flows.
- Do not commit `.env`, keystores, signing passwords, service account files, or private API keys.
- Do not deploy to Netlify or apply live Supabase migrations unless explicitly approved.
- Do not ship a native rewrite until it passes functional, billing, auth, chat, and release-signing checks.

## Prototype Location

Use a separate folder or module, for example:

```text
native-android-prototype/
```

This keeps the prototype away from the current production `android/` Capacitor project.

## Current Private Test APK

The latest side-loadable native prototype APK is published for private testing at:

```text
https://www.thecollegedate.com/private-downloads/native-prototype.html
```

Direct APK:

```text
https://www.thecollegedate.com/private-downloads/TheCollegeDate-native-prototype-debug.apk
```

This is a debug APK for `com.collegedate.prototype`. It must not be uploaded to Google Play Console. Anyone with the link can download it, even though the page is marked `noindex`.

Current prototype coverage:

- Supabase email auth and encrypted session persistence.
- Profile/onboarding repair.
- Discovery candidates and pass/like swipes.
- Conversation list, message loading, text sending, and read marking.
- Image message display through fresh Supabase Storage signed URLs from `metadata.storage_path`.
- RevenueCat premium state, restore, and monthly purchase surface.
- Safety/support links plus prefilled WhatsApp report escalation from chat and Safety.

## Production-Ready Feature Scope

The native prototype must support these flows before it can be considered a real replacement candidate:

- Supabase email login/signup.
- Google OAuth or a documented safe native OAuth bridge.
- Auth session persistence and logout.
- Profile/onboarding status loading.
- Dashboard.
- Match discovery and swipe actions.
- Premium status display.
- RevenueCat Google Play Billing purchase and restore.
- Chat conversation list.
- Chat text messages.
- Chat image messages using private/signed media access.
- Realtime message delivery or a documented polling fallback.
- Settings/support/logout.
- Error states for slow network, failed auth, failed purchase, and failed media upload.

## Backend Compatibility

The prototype should reuse existing backend contracts instead of inventing new ones:

- Supabase project: `gedoyoleoscgxgdqszzc`
- Android package: `com.collegedate.app`
- RevenueCat entitlement: `Premium`
- RevenueCat offering: `android_premium`
- Google Play product/base plan: `premium_monthly:monthly-base`
- OAuth deep link: `com.collegedate.app://auth/callback`

Any new database or Edge Function work must be created as a timestamped migration or function change and reviewed before live application.

## Native UX Goals

- Fast startup and warm navigation.
- Native-feeling Material/Jetpack Compose surfaces.
- Smooth swipe cards.
- Android keyboard-safe chat composer.
- WhatsApp-style chat input and media actions.
- Reliable image loading and retry states.
- Tactile press states and loading skeletons.
- Native-safe billing and logout.
- No web/PWA notification prompts inside native Android.

## Recommended Build Phases

1. **Foundation**
   - Create Kotlin/Compose project beside the current app.
   - Add environment/config loading without committing secrets.
   - Add Supabase client wrapper.
   - Add RevenueCat wrapper.

2. **Auth Shell**
   - Login/signup.
   - Session persistence.
   - Logout.
   - Error and loading states.

3. **Core App**
   - Dashboard.
   - Profile/onboarding read state.
   - Settings.

4. **Match**
   - Discovery feed.
   - Swipe actions.
   - Premium entitlement checks.
   - Presence/LIVE display based on recent activity.

5. **Premium**
   - RevenueCat offerings.
   - Purchase monthly premium.
   - Restore purchases.
   - Server/backend entitlement consistency.

6. **Chat**
   - Conversations.
   - Text messages.
   - Image messages.
   - Signed media URL handling.
   - Realtime subscriptions or safe fallback.
   - Disappearing message display rules.

7. **Release Candidate**
   - Build debug APK.
   - Run emulator or physical-device QA.
   - Build signed AAB only after feature checks pass.
   - Compare against the current Capacitor app.

## Verification Checklist

- `com.collegedate.app` remains the release package.
- Auth login/logout works without callback hang.
- Premium purchase uses RevenueCat production Android key.
- Premium entitlement unlocks app benefits consistently.
- Standard premium swipes do not incorrectly charge wallet.
- Chat images are visible to both sender and receiver.
- Realtime messages do not duplicate.
- Logout clears session and native billing/push context where applicable.
- No secrets are committed.
- Current Capacitor Android app still builds.
- Native prototype build artifacts are clearly separated from production artifacts.

## Emulator Requirement

The current machine has JDK 21 and a local Android SDK at:

```text
C:\Users\HP\.codex\android-sdk
```

However, Android emulator acceleration requires firmware virtualization. Current status:

```text
Virtualization Enabled In Firmware: No
```

Enable virtualization in BIOS/UEFI before relying on the emulator. Until then, physical Android testing over USB is the safer route.
