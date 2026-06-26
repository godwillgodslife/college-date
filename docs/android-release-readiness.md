# Android Release Readiness

Last updated: 2026-05-29

## Current Tester Build

- Latest uploaded/tested stable lineage: `2.2.23` / version code `20`.
- Next planned production-readiness build: `2.2.24` / version code `21`.
- Status: next build removes private APK assets from the native bundle, moves ZEGOCLOUD call token generation server-side, adds Play policy pages, disables Android backup, and runs AAB verification before upload.

## Must-Test Phone Flows

Use the Play testing install, not a direct APK install.

- Google login opens the account picker, returns to the app, and reaches the dashboard.
- Logout from Settings returns to `/login`.
- Login works again after logout.
- Dashboard, Match, Profile, Chat, Settings, and Premium pages open.
- Premium purchase opens the Google Play Billing sheet for `premium_monthly`.
- Current status: purchase flow reaches Google Play Billing, but the latest attempt failed because the connected real card had insufficient funds.
- Next purchase test should use a Google Play license tester account and the test payment method "Test instrument, always approves".
- User confirmed the Google Play purchase later completed successfully.
- After purchase, RevenueCat shows the transaction and entitlement.
- After webhook delivery, Supabase `profiles.is_premium` becomes `true`.
- If `profiles.is_premium` is stale, the app now also treats an active `subscriptions` row as premium.

## RevenueCat Checks

- Android app: `TheCollegeDate Android`
- Package name: `com.collegedate.app`
- Current offering: `android_premium`
- Package: `$rc_monthly`
- Product: `premium_monthly:monthly-base`
- Entitlement: `Premium`
- Expected behavior: native Android uses the Google Play RevenueCat public key, not the Test Store key.

## Supabase Checks

Webhook URL:

```text
https://gedoyoleoscgxgdqszzc.supabase.co/functions/v1/revenuecat-webhook
```

After a successful premium purchase, confirm:

- `profiles.is_premium = true`
- `profiles.premium_expires_at` is populated
- `subscriptions.status` is active or equivalent
- `subscriptions.current_period_end` is populated

Call token function:

```text
https://gedoyoleoscgxgdqszzc.supabase.co/functions/v1/zego-call-token
```

- JWT verification is enabled.
- The function validates the authenticated user is part of the requested `matches` row.
- Required Supabase secrets before the next AAB can be considered call-ready:
  - `ZEGO_APP_ID`
  - `ZEGO_SERVER_SECRET`

## Google Play Console Checks

- Closed testing release is active.
- At least 12 testers are opted in.
- Closed test runs for at least 14 days before applying for production.
- Child safety declaration is completed.
- Store listing has icon, feature graphic, screenshots, description, privacy policy, account deletion URL, and contact details.
- Privacy policy URL: `https://www.thecollegedate.com/privacy.html`
- Terms URL: `https://www.thecollegedate.com/terms.html`
- Account deletion URL: `https://www.thecollegedate.com/delete-account.html`

## Remaining Product Setup

Google Play one-time products are still blocked by Play Console error `568F0620`.

Create when Play Console accepts product drafts:

- `super_swipe`
- `24h_boost`

Then add/import them in RevenueCat as consumable products and attach them to matching packages. Backend support already exists in `revenuecat-webhook`.

## Technical Backlog

- Firebase Android config exists at `android/app/google-services.json`.
- Native push is intentionally enabled with `VITE_ENABLE_NATIVE_PUSH=true`.
- Set Supabase secrets for `zego-call-token` before testing calls in the next AAB.
- Clean up existing source lint backlog. `npm run lint` no longer crashes on generated assets, but currently reports existing source issues.
- Decide whether generated Android web assets under `android/app/src/main/assets/public` should be committed or regenerated in CI.

## Release Build Guardrails

Use:

```text
npm run aab:release
```

This now:

- Builds the web app.
- Deletes stale generated Android web assets before Capacitor sync.
- Runs Capacitor sync.
- Removes website-only private download assets from the Android bundle.
- Builds the release AAB.
- Runs `npm run aab:verify`.

The verifier fails if:

- A private APK or `private-downloads` folder is inside the bundle.
- A RevenueCat `test_` key is detected in extracted text assets.
- The old Zego test-token path or server-secret variable is detected in extracted text assets.
- Version/package/target SDK/manifest security checks do not match the expected release.
