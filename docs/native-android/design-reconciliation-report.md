# Native Android Design Reconciliation Report: The College Date

Date: 2026-08-01  
Target Package: `com.collegedate.app`  
Target Stack: Kotlin 2.0+, Jetpack Compose, Material 3, Hilt, Room, Supabase Kotlin SDK, RevenueCat  
Scope: Final synthesis and authoritative design baseline report for the native Android application.

---

## 1. Executive Summary

This report completes the **UX/UI Reconciliation Audit** for **The College Date** native Android application (`com.collegedate.app`).

It harmonizes the visual layouts of the original Antigravity wireframes (`/wireframes`) with the production logic, monetization architecture, and real-time backend contracts of the live application (`v2.2.36`, `versionCode 33`), producing an authoritative, native Jetpack Compose baseline.

---

## 2. Inventory & Audit Summary

### 2.1 Sources Reviewed
1. **Antigravity Wireframe Showcase**: `src/pages/WireframeShowcase.jsx` & `WireframeShowcase.css` (8 core views).
2. **Live Application Codebase**: 58 React page components (`src/pages/*.jsx`), 25+ routes in `src/App.jsx`.
3. **Live Android Wrapper**: `android/app/build.gradle` (`versionCode 33`, `versionName 2.2.36`), `capacitor.config.json`.
4. **Kotlin Native Codebase**: `android-native/` project structure and existing Compose screens (`feature/splash`, `feature/auth`, `feature/settings`).
5. **Product & Architecture Audits**: `AGENTS.md`, `SIGNING_SETUP.md`, `docs/native-android/*`, `docs/production-readiness-diagnosis.md`.

---

### 2.2 Screens Reviewed & Reconciled (19 Screens)
- `SCR-01`: Splash Screen / Session Router
- `SCR-02`: Welcome Screen
- `SCR-03`: Login Screen
- `SCR-04`: Registration Screen
- `SCR-05`: Password Recovery Screen
- `SCR-06`: Profile Setup Wizard (Onboarding)
- `SCR-07`: Match / Swipe Discovery
- `SCR-08`: Explore Grid & Search
- `SCR-09`: Messages Inbox
- `SCR-10`: Individual Chat Room & Voice/Video Calls
- `SCR-11`: Profile Dashboard & 2x4 Account Hub Grid
- `SCR-12`: Edit Profile & Photo Management
- `SCR-13`: Premium Upgrade & Monetization Shop
- `SCR-14`: Student Wallet & Financial Ledger
- `SCR-15`: Referrals & Rewards
- `SCR-16`: Campus Confessions & Gist
- `SCR-17`: Campus Popularity Leaderboard
- `SCR-18`: Settings & Account Security
- `SCR-19`: Viewers & Secret Admirers

---

## 3. Key Differences & Features Analysis

### 3.1 Main Differences Found
- **Account Navigation**: Wireframe positioned Settings, Referrals, and Wallet in a top navbar dropdown. The live app consolidated these into a **2x4 visual account grid** directly on the Profile page.
- **Swipe Economy & Quotas**: Wireframe illustrated simple card swiping. The live app enforces a 20 swipe/day quota for free users backed by database RPCs (`check_and_reset_swipe_limit`, `send_super_swipe`), while granting unlimited swipes to active Premium subscribers.
- **Emoji Keyboard**: Wireframe used a simple 16-emoji static grid. The live app features a full 6-category emoji picker plus custom **Nigerian Campus Stickers** ("Oversabi", "No Wahala", "Chop Life").

---

### 3.2 Features Introduced After the Original Wireframe
- **RevenueCat Google Play Monetization**: Product ID `premium_monthly:monthly-base` with `$rc_monthly` native package mapping and `revenuecat-webhook` Edge Function.
- **WhatsApp Support Link**: "Become a Partner" action link integrated into Settings.
- **AI Profile Coach & AI Verification**: Inline profile completeness scoring ("85%") and blue AI Verified badges (`profiles.ai_verification_status`).
- **Atomic Super Swipes**: Dedicated `send_super_swipe` RPC with wallet/boost balance validation.
- **Presence & Last Seen Tracking**: Real-time presence updates (`update_user_presence`) recording `last_seen_at` and `is_live`.

---

### 3.3 Outdated Wireframe Areas
- Top navbar dropdown menus (superseded by Profile page 2x4 Account Hub grid).
- Restricted 16-emoji grid in Chat (superseded by 6-category emoji picker & Nigerian campus stickers).
- Lack of offline state representations (superseded by Room DB offline data policy).

---

## 4. Preservation & Removal Guidelines

### 4.1 Live-App Behaviors to Preserve (Backend & Business Logic)
- **Supabase PKCE Authentication & Session Management**.
- **RevenueCat Google Play Subscription Billing** (`com.revenuecat.purchases`).
- **All Supabase Database RPCs** (`discovery_feed_v3`, `send_super_swipe`, `get_profile_viewers_secure`, `validate_referral_code`, `apply_referral_code`, `update_user_presence`).
- **Nigerian University Selection Catalog** (`UNILAG`, `OAU`, `UI`, `FUTA`, `LASU`, etc.).
- **2x4 Profile Visual Account Grid**.

---

### 4.2 Live-App Behaviors to Remove (Web-Wrapper Artifacts)
- White browser splash screens on cold launch (replaced by Android 12+ `SplashScreen`).
- Custom JavaScript `--vh` viewport height hacks (replaced by Jetpack Compose `WindowInsets.ime`).
- HTML `<input type="file">` browser file chooser dialogs (replaced by native Android `PickVisualMedia` Photo Picker).
- Web browser history navigation bugs on back-button press (replaced by `androidx.navigation.compose.NavHost` and `BackHandler`).
- Web OneSignal deferred script injection (replaced by native Firebase Cloud Messaging).
- Non-native HTML `<select>` dropdowns (replaced by Material 3 `ExposedDropdownMenuBox` and `ModalBottomSheet`).

---

### 4.3 Recommended Native Android Improvements
- **Hardware-Accelerated Fling Swiping**: Jetpack Compose `Modifier.pointerInput` executing on RenderThread.
- **Local-First Architecture**: Room DB caching for discovery cards, chat messages, and profile summaries.
- **Coil Image Loading Engine**: Disk and memory caching with progressive image rendering.
- **Material 3 System Theme Integration**: Dynamic edge-to-edge layout (`enableEdgeToEdge()`) respecting Android system bar insets.

---

## 5. Authoritative Source-of-Truth Hierarchy

When implementing native Android screens in `android-native/`, follow this strict hierarchy:
1. **Product Rules, Security & Database RPCs**: Web production backend (`src/services/`, Supabase migrations, `AGENTS.md`).
2. **Visual Layout & Thumb Ergonomics**: Antigravity Wireframe Showcase (`WireframeShowcase.jsx`, `WireframeShowcase.css`) combined with `docs/native-android/native-design-system.md`.
3. **Native UI Implementation Codebase**: `android-native/` Kotlin Compose project.

---

## 6. Decision & Implementation Readiness

### 6.1 Product Owner Decisions Required
All 5 decision items documented in `docs/native-android/design-decisions-required.md` have recommended default choices with zero implementation blockers.

### 6.2 Screens Safe for Implementation (100% Unblocked)
- `SCR-01`: Splash Screen (`SplashScreen.kt`)
- `SCR-02`: Welcome Screen (`WelcomeScreen.kt`)
- `SCR-03`: Login Screen (`LoginScreen.kt`)
- `SCR-04`: Registration Screen (`RegistrationScreen.kt`)
- `SCR-05`: Password Recovery Screen (`PasswordRecoveryScreen.kt`)
- `SCR-06`: Profile Setup Wizard (`OnboardingScreen.kt`)
- `SCR-11`: Profile Dashboard & 2x4 Grid (`ProfileHubScreen.kt`)
- `SCR-12`: Edit Profile Screen (`EditProfileScreen.kt`)
- `SCR-18`: Settings Screen (`SettingsScreen.kt`)

### 6.3 Recommended Next Implementation Phase
Proceed directly to **Phase 1: Authentication & Onboarding** in `android-native/` as outlined in `docs/native-android/antigravity-native-ui-plan.md`.

---

## 7. Files Created During Reconciliation Audit

1. `docs/native-android/design-source-inventory.md` (Stage 1)
2. `docs/native-android/live-app-screen-inventory.md` (Stage 2)
3. `docs/native-android/original-wireframe-inventory.md` (Stage 3)
4. `docs/native-android/wireframe-live-app-comparison.md` (Stage 4)
5. `docs/native-android/web-wrapper-behaviours-to-remove.md` (Stage 5)
6. `docs/native-android/authoritative-native-user-flow.md` (Stage 6)
7. `docs/native-android/authoritative-native-screen-inventory.md` (Stage 7)
8. `docs/native-android/native-design-system.md` (Stage 9)
9. `docs/native-android/design-decisions-required.md` (Stage 10)
10. `docs/native-android/codex-native-ui-handoff.md` (Stage 11A)
11. `docs/native-android/antigravity-native-ui-plan.md` (Stage 11B)
12. `docs/native-android/design-reconciliation-report.md` (Stage 12 - This report)

*Note: No existing web files in `src/` or `android/` were modified or deleted during this audit.*

---

## 8. Final Audit Verification

- [x] Every current live screen inventoried (`docs/native-android/live-app-screen-inventory.md`).
- [x] Every original wireframe screen inventoried (`docs/native-android/original-wireframe-inventory.md`).
- [x] Mismatches classified with explicit rules (`docs/native-android/wireframe-live-app-comparison.md`).
- [x] Features introduced after original wireframes captured (RevenueCat, AI Coach, Super Swipes, Presence).
- [x] Web-wrapper limitations identified and paired with native Compose replacements (`docs/native-android/web-wrapper-behaviours-to-remove.md`).
- [x] Authoritative user flow updated (`docs/native-android/authoritative-native-user-flow.md`).
- [x] Authoritative native screen inventory created (`docs/native-android/authoritative-native-screen-inventory.md`).
- [x] Design system defined (`docs/native-android/native-design-system.md`).
- [x] Product decision list completed (`docs/native-android/design-decisions-required.md`).
- [x] Codex engineering handoff created (`docs/native-android/codex-native-ui-handoff.md`).
- [x] Antigravity phased UI plan created (`docs/native-android/antigravity-native-ui-plan.md`).
- [x] Zero user PII exposed.
- [x] Web app and Kotlin codebase un-mutated.

---

<!-- GOAL_COMPLETE -->
