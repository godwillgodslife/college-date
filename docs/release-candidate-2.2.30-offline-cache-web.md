# The College Date 2.2.30 Offline Cache/Web RC

Date: 2026-07-15
Version: 2.2.30
Android version code: 27

## Scope

- Enabled cache-first persistent SWR fallback for the web app, not only the native Android shell.
- Enabled idle app data warmup for web and native sessions.
- Kept controlled media cache shared across web and native.
- Applied Supabase idempotency support for swipe payment retries.
- Kept offline paid swipes disabled unless `VITE_ENABLE_OFFLINE_PAID_SWIPES=true`.
- Applied release-gate Supabase compatibility fixes for stale RPC/schema issues found by linked lint.

## Verified

- Focused ESLint passed for changed web/cache files.
- `npm run build` passed.
- `npx cap sync android` passed.
- `./gradlew assembleRelease` passed.
- `./gradlew bundleRelease` passed.
- `npm run aab:verify` passed.
- Full `npm run lint` passed with warnings and no errors.
- `npx supabase db lint --linked` reports no errors, only older unused-variable warnings.

## Artifacts

- `release/TheCollegeDate-2.2.30-vc27-offline-cache-web-rc-20260715-1401.apk`
- `release/TheCollegeDate-2.2.30-vc27-offline-cache-web-rc-20260715-1401.aab`
- `release/TheCollegeDate-2.2.30-vc27-offline-cache-web-lintgate-20260715-1412.apk`
- `release/TheCollegeDate-2.2.30-vc27-offline-cache-web-lintgate-20260715-1412.aab`

## Lint-Gate Artifact Hashes

- APK SHA256: `A42DF48772B1B14A4E7E8F02095E8874F09D9D35A9FA562FDFF2FF5CF658E336`
- AAB SHA256: `61483F54F59227C6EE0016178DF03C049B9839615D9681AB01F4812EC53B53BB`

## Known Limitations

- `npm run lint` still reports pre-existing warnings, mostly unused symbols and hook dependency warnings, but it no longer fails the release gate.
- Paid offline swipe replay remains intentionally disabled until real-device QA.
- Media caching covers optimized images, swipe-card preloads, and chat images; audio/video offline media caching is still not expanded.
- No Netlify production deploy has been run.
- No Google Play upload has been run.
