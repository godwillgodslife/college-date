# iOS Release Readiness

This project has an iOS Capacitor shell at `ios/App` using the same web app bundle as Android.

## Prepared Locally

- App bundle id: `com.collegedate.app`
- Display name: `The College Date`
- Version: `2.2.26`
- Build number: `23`
- iOS deployment target: `15.0`
- Current web assets copied into `ios/App/App/public`
- Native plugins synced:
  - Capacitor App
  - Capacitor Browser
  - Capacitor Keyboard
  - Capacitor Local Notifications
  - Capacitor Push Notifications
  - Capacitor Splash Screen
  - OneSignal Capacitor
  - RevenueCat Purchases Capacitor
- iOS privacy descriptions added for camera, microphone, photo library, and location.
- OAuth deep link scheme added:
  - `com.collegedate.app://auth/callback`
- RevenueCat initialization now uses a separate iOS key through `VITE_REVENUECAT_IOS_KEY`.

## Required Before App Store Build

1. Apple Developer Program membership.
2. App Store Connect app record for bundle id `com.collegedate.app`.
3. Xcode on macOS, or a trusted macOS cloud runner.
4. A RevenueCat iOS app configured for App Store purchases. RevenueCat currently blocks this until the App Store Connect in-app purchase `.p8` key is available.
5. An iOS RevenueCat public SDK key in the production build environment:
   - `VITE_REVENUECAT_IOS_KEY=appl_...`
6. App Store subscription product matching the RevenueCat entitlement/offering strategy:
   - Entitlement: `Premium`
   - Offering: use the current offering in RevenueCat, same behavior as Android.
7. Apple push notification setup if native iOS push is enabled through OneSignal.
8. Supabase OAuth redirect allow-list must include:
   - `com.collegedate.app://auth/callback`

## macOS Build Commands

Run these from a fresh clone or from this project folder on macOS:

```bash
npm ci
npm run build
npx cap sync ios
npx cap open ios
```

Then in Xcode:

1. Open `ios/App/App.xcodeproj`.
2. Select the `App` target.
3. Set the Apple Team under Signing & Capabilities.
4. Confirm bundle id is `com.collegedate.app`.
5. Confirm version is `2.2.26` and build is `23`.
6. Build on an iPhone simulator first.
7. Test login, onboarding, profile photo upload, chat, voice/video call permissions, RevenueCat paywall loading, logout, and push-permission behavior.
8. Archive with `Any iOS Device`.
9. Distribute to App Store Connect for TestFlight.

## GitHub macOS Smoke Build

A manual GitHub Actions workflow is available at:

- `.github/workflows/ios-smoke-build.yml`

It runs on a macOS runner, installs dependencies, builds the web app, syncs Capacitor iOS, and runs an unsigned iPhone simulator Xcode build. This is useful before Apple signing is ready because it catches iOS compile/plugin problems without needing certificates.

## Notes

- A signed `.ipa` or App Store archive cannot be produced on this Windows machine because Apple requires Xcode/macOS signing tooling.
- If `npx cap sync ios` is run on Windows, `ios/App/CapApp-SPM/Package.swift` may be regenerated with Windows path separators. Re-run `npx cap sync ios` on macOS before opening in Xcode, or ensure the package paths use forward slashes.
- Keep Paystack for web payments. Use RevenueCat/App Store purchases for native iOS.
- RevenueCat's App Store setup needs these Apple values from App Store Connect before it can generate the real iOS SDK public key: `.p8` in-app purchase key file, Key ID, and Issuer ID.
