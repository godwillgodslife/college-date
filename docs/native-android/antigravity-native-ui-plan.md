# Antigravity Native UI Implementation Plan

Date: 2026-08-01  
Target Repository: `android-native/`  
Stack: Kotlin 2.0+, Jetpack Compose, Material 3, Hilt, Room, Supabase Kotlin SDK, Coil  
Scope: Phased step-by-step UI implementation and verification roadmap for Antigravity.

---

## 1. Executive Summary

This plan structures the native Android Jetpack Compose UI implementation for **The College Date** into 10 distinct, sequential phases. Each phase specifies screens, components, dependencies, acceptance criteria, emulator/device verification steps, and screenshot requirements.

---

## 2. Phased Implementation Roadmap

### Phase 1: Authentication & Onboarding
- **Target Screens**: `SCR-01` (Splash), `SCR-02` (Welcome), `SCR-03` (Login), `SCR-04` (Register), `SCR-05` (Password Recovery), `SCR-06` (Onboarding Setup Pager)
- **Key Components**: `CollegeDateButton`, `CollegeDateTextField`, `HorizontalPager` onboarding wizard, `PickVisualMedia` Photo Picker
- **Dependencies**: Supabase Auth SDK (`gotrue-kt`), DataStore session manager
- **Codex Integration Prerequisite**: Yes — `AuthViewModel` must be wired to Supabase Auth.
- **Acceptance Criteria**:
  - Cold launch evaluates session and routes cleanly without white flashes.
  - Onboarding wizard enforces 18+ check, Nigerian university selection, and 1+ photo upload.
  - Form validation displays red alert banners for invalid credentials.
- **Verification Method**: Run on Android Emulator (API 34/35) or physical Android device (`adb logcat`).
- **Required Screenshots**: Splash screen, Welcome screen, Login screen with error, Onboarding Step 2 (University selector), Onboarding Step 5 (Photo upload).

---

### Phase 2: Main Navigation & Application Shell
- **Target Screens**: `SCR-07` (Discovery Shell), `SCR-08` (Explore), `SCR-09` (Inbox), `SCR-16` (Confessions), `SCR-11` (Profile Hub)
- **Key Components**: `CollegeDateBottomBar`, `CollegeDateTopBar`, Notification unread badge, Wallet balance pill
- **Dependencies**: Jetpack Compose `NavHost`, `BackHandler`
- **Codex Integration Prerequisite**: No — Can be built with preview mock state.
- **Acceptance Criteria**:
  - Bottom navigation persists across all 5 main screens with smooth tab transitions.
  - Back button presses navigate back through tab history or prompt app exit cleanly.
- **Verification Method**: Emulator tab switching & back button tests.
- **Required Screenshots**: Main shell showing all 5 active tabs with bottom bar highlight.

---

### Phase 3: Profile Creation & Editing
- **Target Screens**: `SCR-11` (Profile Hub), `SCR-12` (Edit Profile)
- **Key Components**: Cover photo header, AI Coach card, 2x4 Visual Account Grid, 6-slot photo upload grid, Bio textarea with character counter
- **Dependencies**: `profiles` table, `profile-photos` storage bucket, Coil image loader
- **Codex Integration Prerequisite**: Yes — Profile Repository must support read/write operations.
- **Acceptance Criteria**:
  - Profile Hub displays verification badges (🎓, 💙) and AI Coach recommendations.
  - All 8 Account Grid tiles navigate to their respective sub-routes.
  - Edit Profile saves updated bio and photos to Supabase.
- **Verification Method**: Edit profile bio and verify persistence after app restart.
- **Required Screenshots**: Profile Hub screen, Edit Profile screen.

---

### Phase 4: Discovery & Native Swiping
- **Target Screens**: `SCR-07` (Match / Swipe Discovery)
- **Key Components**: Stacked card deck (`Modifier.pointerInput` drag gestures), Thumb-Zone Action Row (✕ Pass 60dp, ⭐ Super Swipe 50dp, ❤️ Like 60dp), Mutual Match Modal
- **Dependencies**: `discovery_feed_v3`, `send_super_swipe` RPC, Room DB pending swipes
- **Codex Integration Prerequisite**: Yes — Discovery Repository must fetch profiles.
- **Acceptance Criteria**:
  - Fluid 120Hz card fling animations with touch rotation.
  - Swiping right sends Like; swiping left sends Pass; swiping up triggers Super Swipe.
  - Reaching daily swipe limit displays Premium upsell dialog.
- **Verification Method**: Perform 10 swipes on emulator and inspect `swipes` database table.
- **Required Screenshots**: Discovery swipe card view, Mutual Match modal.

---

### Phase 5: Matches & Messaging
- **Target Screens**: `SCR-09` (Inbox), `SCR-10` (Chat Room)
- **Key Components**: Horizontal New Matches carousel (`LazyRow`), Active Conversation List (`LazyColumn`), Chat thread stream, Smart Reply strip, Sticker Drawer (`ModalBottomSheet`)
- **Dependencies**: Supabase Realtime WebSocket subscription (`realtime-kt`), `messages` table
- **Codex Integration Prerequisite**: Yes — Chat Repository must handle Realtime channels.
- **Acceptance Criteria**:
  - Incoming messages appear instantly in thread without full list re-render.
  - Tapping AI Smart Reply chip inserts text into composer.
  - Sticker Drawer presents 6 emoji categories + Nigerian campus stickers ("Oversabi", "Chop Life").
- **Verification Method**: Send and receive real-time messages between two test user accounts.
- **Required Screenshots**: Inbox screen, Chat room thread, Sticker drawer open.

---

### Phase 6: Notifications
- **Target Screens**: Notification Center (`/notifications`), Top Bar Bell Icon
- **Key Components**: Notification list items, unread indicator badge, system push handlers
- **Dependencies**: Firebase Cloud Messaging (FCM), native OneSignal SDK
- **Codex Integration Prerequisite**: Yes — FCM device registration service.
- **Acceptance Criteria**:
  - Tapping push notification opens corresponding chat or match route natively.
  - Unread badge counter matches actual unread notification count.
- **Verification Method**: Trigger test FCM push payload via Firebase Console.
- **Required Screenshots**: Notification Center screen.

---

### Phase 7: Premium, Wallet, Referrals & Leaderboard
- **Target Screens**: `SCR-13` (Premium Upgrade), `SCR-14` (Wallet), `SCR-15` (Referrals), `SCR-17` (Leaderboard), `SCR-19` (Viewers)
- **Key Components**: Premium Crown Hero Banner, RevenueCat Plan Cards, Wallet Balance Card (`₦`), Referral Code Share Box, Leaderboard Podium Top 3 View, Blurred Viewers Cards
- **Dependencies**: RevenueCat Android SDK (`purchases-kt`), `leaderboard_unified` view, Android Share Intent
- **Codex Integration Prerequisite**: Yes — RevenueCat and Wallet Repositories.
- **Acceptance Criteria**:
  - RevenueCat package fetch renders current Google Play monthly subscription price.
  - Referral share button invokes native Android Share Intent (`Intent.ACTION_SEND`).
  - Viewers cards display blurred photos for free users and unblurred photos for Premium users.
- **Verification Method**: Test RevenueCat sandbox purchase flow on Android device.
- **Required Screenshots**: Premium Upgrade screen, Wallet screen, Referrals screen, Leaderboard screen, Viewers screen.

---

### Phase 8: Settings & Account Lifecycle
- **Target Screens**: `SCR-18` (Settings & Security)
- **Key Components**: Account Settings Group, Support & WhatsApp Partner link, Sign Out button, Red Delete Account Button with confirmation modal
- **Dependencies**: `profiles.notification_settings`, `delete_user_account` RPC
- **Codex Integration Prerequisite**: Yes — Auth repository sign-out flow.
- **Acceptance Criteria**:
  - Sign Out purges local DataStore and Room DB tables and navigates to Welcome screen.
  - Delete Account displays double-confirmation dialog before invoking backend deletion.
- **Verification Method**: Execute sign-out and verify local database tables are empty.
- **Required Screenshots**: Settings screen, Delete Account confirmation dialog.

---

### Phase 9: Offline, Error & Loading States
- **Target Screens**: All screens
- **Key Components**: Skeleton shimmer loaders, Offline Banner ("Offline mode — showing cached data"), Retry buttons
- **Dependencies**: Room DB local caching, Android `ConnectivityManager`
- **Codex Integration Prerequisite**: Yes — Room DB repositories.
- **Acceptance Criteria**:
  - Enabling Airplane Mode keeps previously loaded discovery cards, chat messages, and profile details visible.
  - Pending offline swipes queue locally and sync automatically when network connection returns.
- **Verification Method**: Enable Airplane Mode on emulator and navigate through app.
- **Required Screenshots**: Offline banner on Discovery screen, Skeleton shimmer loading state.

---

### Phase 10: Visual QA & Device Adaptation
- **Target**: All screens across multiple Android form factors
- **Devices Tested**:
  - Small phone (360dp width, e.g. Pixel 4a)
  - Medium phone (412dp width, e.g. Pixel 7 / 8)
  - Large phone / Foldable (440dp+ width, e.g. Pixel 8 Pro / Galaxy Ultra)
  - Dark Mode enforcement verification
- **Acceptance Criteria**:
  - Zero text clipping, horizontal overflow, or obscured touch targets across all screen sizes.
  - Smooth 60/120Hz scrolling without frame drops.
- **Verification Method**: Execute layout tests across multiple Android Virtual Devices (AVDs).
- **Required Screenshots**: Full multi-device visual QA portfolio.

---

## 3. Verification & Compliance Notes

- **10-phase UI implementation roadmap fully defined.**
- **Codex integration prerequisites explicitly marked per phase.**
- **Stage 11B Antigravity Implementation Plan Complete.**
