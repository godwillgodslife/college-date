# Design Source Inventory: The College Date (Native Android Reconciliation)

Date: 2026-08-01  
Target Package: `com.collegedate.app`  
Scope: Comprehensive catalog of design references, web wrapper routes, product documentation, screenshot assets, and native Kotlin code.

---

## 1. Executive Summary

This inventory catalogues all existing visual, behavioral, architectural, and documentation references for **The College Date** across five primary layers:
1. **Antigravity Wireframe Showcase** (`WireframeShowcase.jsx`, `WireframeShowcase.css`)
2. **Live Web / Capacitor Application** (`src/pages/*`, `src/App.jsx`, `android/`)
3. **Product Documentation & Audits** (`AGENTS.md`, `SIGNING_SETUP.md`, `docs/native-android/*`)
4. **Visual Screenshots & Image Assets** (`*.png`, `src/assets/*`, `public/*`)
5. **New Kotlin Native Foundation** (`android-native/`, `native-android-prototype/`)

---

## 2. Design Source Catalog Table

| Source Name | Repository Path / Location | Source Type | Last Known Relevance | Screens Covered | Outdated Status | Nature (Visual / Behavioral) | Confidence Level | Important Limitations |
|---|---|---|---|---|---|---|---|---|
| **Antigravity Wireframe Showcase Component** | `src/pages/WireframeShowcase.jsx` | React Component / Interactive UI | High (Authoritative wireframe reference) | Match/Swipe, Inbox, Chat, Profile & AI Coach, Onboarding, Explore, Confessions, Leaderboard | Partially Outdated (Created prior to live app adjustments; lacks offline states & payment edge cases) | Visual & Behavioral | High | Simulates UI inside web device frames; contains hardcoded mock data rather than live API queries. |
| **Wireframe Showcase Stylesheet** | `src/pages/WireframeShowcase.css` | CSS Stylesheet | High (Visual token reference) | All 8 wireframe showcase screens | Current for wireframe styling | Visual | High | Web-specific CSS variables, glassmorphism filters, and desktop side-inspector rules. |
| **React App Route Registry** | `src/App.jsx` | Web App Routing & Shell | High (Live application structure) | All 25+ web routes (Landing, Auth, Match, Explore, Chat, Profile, EditProfile, Settings, Referrals, Wallet, Requests, Leaderboard, Confessions, Premium, Viewers, MiniProfileSetup, NotificationCenter, VoiceCallRoom) | Current | Behavioral & Navigation | High | Defines Web SPA routes; includes web chunk lazy-loading, PWA hooks, and web OneSignal listeners. |
| **Live Web / Capacitor Page Implementations** | `src/pages/*.jsx` (58 files) | React Components | High (Current production logic & UI) | Match, Inbox, Chat, Profile, EditProfile, Settings, Referrals, Wallet, Requests, Leaderboard, Confessions, Premium, Viewers, MiniProfileSetup, Status, Snap, AdminDashboard | Current Production Baseline | Visual & Behavioral | High | Contains web DOM nodes (`<div>`, `<span>`), HTML file inputs, web SWR caching, and Capacitor JS bridge wrappers. |
| **Capacitor Configuration** | `capacitor.config.json` | Native Shell Config | High (Live Android Wrapper) | App shell, native deep links, splash configuration, status bar | Current (`versionCode 33`, `versionName 2.2.36`) | Behavioral | High | Configures WebView web runtime wrapper rather than native Android Jetpack Compose views. |
| **Android Wrapper Gradle Config** | `android/app/build.gradle` & `android/variables.gradle` | Gradle Build Manifest | High (Live Android Build Settings) | Native package namespace (`com.collegedate.app`), SDKs (`compileSdk 36`, `targetSdk 36`, `minSdk 24`) | Current | Behavioral | High | Contains legacy Webview wrapper build tasks, Capacitor plugin dependencies, and Groovy signing rules. |
| **Kotlin Native Project Foundation** | `android-native/` | Android Studio Kotlin Project | High (Target Native Android Codebase) | Splash (`SplashScreen.kt`), Welcome (`WelcomeScreen.kt`), Login (`LoginScreen.kt`), Register (`RegistrationScreen.kt`), Password Recovery (`PasswordRecoveryScreen.kt`), Email Verification (`EmailVerificationScreen.kt`), Onboarding Placeholder, Settings Placeholder | Active Development Baseline | Visual & Behavioral | High | Contains initial Auth/Navigation foundation in Jetpack Compose; main app screens (Swipe, Chat, Profile) are currently placeholders. |
| **Kotlin Native Prototype Sandbox** | `native-android-prototype/` | Standalone Prototype | Low (Early exploratory build) | Early auth proof-of-concept | Outdated (Superseded by `android-native/`) | Behavioral | Medium | Standalone prototype used for initial Supabase Kotlin SDK spike; should not receive new code edits. |
| **Project Master Summary** | `AGENTS.md` | Product Documentation | High (Production history & handoffs) | Whole application, database migrations, monetization, RevenueCat setup, OAuth fixes, push notification setup | Current | Behavioral & Requirements | High | Document text; provides historical context on all recent feature releases up to v2.2.27+. |
| **Android Signing Documentation** | `SIGNING_SETUP.md` | Deployment Guide | High (Android Signing Instructions) | Release AAB build generation, keystore alias, Gradle properties | Current | Behavioral | High | Documents `college-date-release.jks` setup and Play Console release bundle rules. |
| **Native Migration Map** | `docs/native-android/native-migration-map.md` | Technical Migration Plan | High (Feature classification & schema mapping) | Auth, Onboarding, Discovery, Messaging, Profile, Wallet, Premium, Referrals, Leaderboard | Current | Behavioral & Data Schema | High | Maps web routes and Supabase tables/RPCs to native Kotlin domain models. |
| **Current System Audit** | `docs/native-android/current-system-audit.md` | Backend Dependency Audit | High (Backend contracts & confidence levels) | Supabase tables (`profiles`, `swipes`, `matches`, `messages`, `wallets`, `subscriptions`, etc.) & RPCs | Current | Behavioral & Backend | High | Thorough inventory of Supabase RLS policies, RPC signatures, and public client safety flags. |
| **Offline Data Policy** | `docs/native-android/offline-data-policy.md` | Data Policy & Local Storage | High (Room & DataStore architecture) | Offline swipe queue, profile cache, message persistence, Room DB | Current | Behavioral | High | Defines local persistence boundaries, encrypted token storage, and background sync logic. |
| **Production Readiness Diagnosis** | `docs/production-readiness-diagnosis.md` | Security & Performance Audit | High (Backend security hardening history) | Security-definer views, RLS policies, function permissions, index performance | Current | Behavioral & Security | High | Documents security fixes applied to `discovery_feed_v3`, `leaderboard_unified`, and `optimized_confessions`. |
| **Visual Screenshot Artifacts** | `landing_screenshot*.png`, `profile_screenshot.png`, `wireframe_preview.png`, `wireframe_shot.png` | PNG Image Files | Medium (Historical visual snapshots) | Landing page, Profile dashboard, Wireframe preview render | Static Snapshots | Visual | Medium | Visual snapshots captured during earlier web development turns. |

---

## 3. Analysis & Key Findings

1. **Dual Codebase Reality**:
   - The repository contains both the active web application (React + Vite + Capacitor wrapper in `src/` & `android/`) and the new native Android application (`android-native/`).
   - `android-native/` uses Kotlin 2.0+, Jetpack Compose, Material 3, Ktor/Supabase Kotlin SDK, Room DB, and Hilt.

2. **Wireframe vs. Live App Discrepancies**:
   - `WireframeShowcase.jsx` contains key UX design targets (Thumb-Zone Actions, AI Profile Coach, WhatsApp-style Composer, Category Confessions, Visual Account Grid).
   - However, the live app in `src/pages/` has evolved beyond the wireframe in several areas, including RevenueCat Google Play billing, explicit PKCE auth callbacks, dynamic presence tracking (`last_seen_at`), atomic Super Swipes, and SWR persistent caching.

3. **Authoritative Hierarchy**:
   - **Product Logic & Security**: Web production app (`src/pages/`, `src/services/`, Supabase migrations, `AGENTS.md`) represents the source of truth for business rules, RPC signatures, and backend contracts.
   - **Native Android UX & Layout**: `WireframeShowcase.jsx` combined with native Material 3 design patterns forms the source of truth for visual hierarchy, thumb reachability, and layout composition.
   - **Target Codebase**: `android-native/` is the sole destination for native Jetpack Compose implementations.

---

## 4. Verification & Scope Boundaries

- **No files in `src/` or `android/` were modified.**
- **No production deployments or Supabase schema edits were executed.**
- **Inventory completed for Stage 1 of Native Android Reconciliation Audit.**
