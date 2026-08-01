# Play Store Native Migration Readiness

Date: 2026-08-01

## Summary

The native Android project can eventually replace the current Capacitor wrapper as an update to the same Google Play listing if it keeps the same application ID, uses a higher version code, and is signed with the accepted Play upload key.

It is not ready for Play upload today.

## Application Identity

| Item | Current wrapper | Native project | Status |
|---|---|---|---|
| Application ID | `com.collegedate.app` | `com.collegedate.app` | Matches |
| Debug application ID | `com.collegedate.app.debug` | `com.collegedate.app.debug` | Safe for local debug |
| Version code | `33` | `1` | Native must be raised above 33 before Play update |
| Version name | `2.2.36` | `0.1.0-native-phase1` | Native must use release-ready version name before Play update |
| Minimum SDK | 24 | 24 | Matches |
| Compile SDK | 36 | 36 | Matches |
| Target SDK | 36 | 36 | Matches |

Evidence:

- Existing wrapper: `android/app/build.gradle`
- Native project: `android-native/app/build.gradle.kts`

## Signing

Existing wrapper:

- Release signing reads `android/keystore.properties` or environment variables.
- `SIGNING_SETUP.md` documents `storeFile=app/college-date-release.jks` and alias `collegedate`.
- If release signing is unavailable, the wrapper falls back to debug signing for local builds.

Native project:

- Release build currently uses debug signing for Phase 1/1.5 build verification only.
- Native release signing is not Play-ready.

Upload key availability:

- Not confirmed in this task.
- The repository contains signing setup documentation, but no signing key or password was inspected or requested.

Play App Signing:

- Not confirmable from repository evidence.
- `SIGNING_SETUP.md` recommends Play App Signing, but this does not prove enrollment.

Do not document or request signing passwords in source files or reports.

## Deep Links And Auth Callbacks

Existing wrapper uses:

- `com.collegedate.app://auth/callback`
- `https://www.thecollegedate.com/auth/callback`
- `https://www.thecollegedate.com/reset-password`
- Many HTTPS app links for existing web routes.

Native Phase 1.5 uses:

- `com.collegedate.app://auth/callback`
- `com.collegedate.app://reset-password`

Native risk:

- The native app does not yet mirror every HTTPS app link currently handled by the Capacitor wrapper.
- Supabase dashboard callback URLs should include the native custom-scheme callbacks before OAuth/password-reset QA.
- If HTTPS app links remain part of production auth, native intent filters and Digital Asset Links must be reviewed before release.

## Update Risks For Existing Wrapper Users

- Feature parity: native Phase 1.5 implements auth foundation only. Discovery, swiping, messaging, wallet, Premium, referrals, push, and payments are intentionally absent.
- Version code: native `versionCode` must exceed wrapper `33`.
- Signing: native release must use the same accepted Play upload key path.
- Session migration: wrapper auth/session state lives in WebView/browser storage; native Supabase session storage is separate. Existing users may need to sign in again unless a reviewed migration bridge is designed.
- Local cache migration: wrapper service-worker/web caches will not migrate into Room/DataStore.
- Deep links: native must preserve auth/reset links and route existing notification/app links safely.
- Push tokens: native FCM/OneSignal registration is not yet complete.
- Payments: native must not ship until Google Play Billing/RevenueCat flows are natively reviewed or intentionally deferred behind safe UI.
- Account deletion/logout: full device verification is still required.

## Can The Native App Be Uploaded As An Update?

Yes, eventually, if all of these are true:

1. Application ID remains `com.collegedate.app`.
2. `versionCode` is greater than the currently published wrapper version code.
3. Release AAB is signed with the accepted Play upload key.
4. Play App Signing status and upload key ownership are confirmed.
5. All production-critical routes and deep links are supported.
6. Auth/session/logout/device QA passes.
7. RLS concerns for `profiles` are resolved before native discovery/profile features ship.
8. Feature parity or a controlled migration plan is approved for existing users.

## Current Readiness Decision

Not ready for Play upload.

The native project is suitable for internal device QA only after an emulator/device and approved test account are available. It should not replace the web wrapper until Phase 2+ feature scope, RLS, signing, deep links, push, and payments have been reviewed.
