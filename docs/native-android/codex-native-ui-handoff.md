# Codex Native UI Engineering Handoff

Date: 2026-08-01  
Target Repository: `android-native/`  
Target Stack: Kotlin 2.0+, Jetpack Compose, Material 3, Hilt, Room, Supabase Kotlin SDK 2.x, Coil  
Scope: Architecture specification, data flow contracts, and component handoff for Codex engineers.

---

## 1. Executive Summary

This handoff package provides the definitive engineering contract for implementing **The College Date** native Android UI in Jetpack Compose inside `android-native/`.

It specifies screen routes, Hilt ViewModels, Room DB entities, Supabase RPC contracts, offline persistence boundaries, gesture mechanics, and acceptance criteria.

---

## 2. Navigation Architecture & Route Contract

Navigation is managed via `androidx.navigation.compose.NavHost` inside `MainShell.kt` or root `MainActivity.kt`.

```kotlin
sealed class Screen(val route: String) {
    object Splash : Screen("splash")
    object Welcome : Screen("welcome")
    object Login : Screen("login")
    object Register : Screen("register")
    object PasswordRecovery : Screen("password_recovery")
    object EmailVerification : Screen("email_verification")
    object Onboarding : Screen("onboarding")
    
    // Main Shell Tabs
    object Discovery : Screen("discovery")
    object Explore : Screen("explore")
    object Inbox : Screen("inbox")
    object Confessions : Screen("confessions")
    object ProfileHub : Screen("profile_hub")
    
    // Sub-routes
    data class ChatRoom(val matchId: String) : Screen("chat/{matchId}") {
        companion object { fun createRoute(matchId: String) = "chat/$matchId" }
    }
    data class UserProfile(val userId: String) : Screen("profile/{userId}") {
        companion object { fun createRoute(userId: String) = "profile/$userId" }
    }
    object EditProfile : Screen("edit_profile")
    object Premium : Screen("premium")
    object Wallet : Screen("wallet")
    object Referrals : Screen("referrals")
    object Leaderboard : Screen("leaderboard")
    object Settings : Screen("settings")
    object Viewers : Screen("viewers")
}
```

---

## 3. Data & Storage Contracts

### 3.1 Local Persistence (Room DB)
- `ProfileEntity`: Caches active user profile & visited profiles (`id`, `full_name`, `university`, `department`, `level`, `bio`, `profile_photos`, `is_premium`, `is_onboarded`).
- `DiscoveryCardEntity`: Caches discovery feed cards locally for offline swiping (`id`, `full_name`, `age`, `university`, `department`, `photos`, `compatibility_score`).
- `PendingSwipeEntity`: Queue for offline swipes (`id`, `target_user_id`, `swipe_type`, `created_at`, `synced`).
- `MessageEntity`: Caches chat messages per match (`id`, `match_id`, `sender_id`, `content`, `created_at`, `status`).

### 3.2 Key Supabase RPC Contracts
- `discovery_feed_v3`: Queries discovery cards (`p_limit`, `p_offset`).
- `send_super_swipe(p_target_id uuid)`: Atomic super swipe execution.
- `check_and_reset_swipe_limit(user_id uuid)`: Quota check RPC.
- `get_profile_viewers_secure()`: Fetches profile viewer metadata.
- `get_admirers_secure()`: Fetches admirers list.
- `validate_referral_code(code text)`: Validates referral code.

---

## 4. Feature Area Technical Handoff Packages

### Feature 1: Authentication & Splash (`SCR-01` to `SCR-05`)
- **Status**: Implemented in `feature/splash` and `feature/auth`.
- **ViewModel**: `AuthViewModel.kt`
- **Dependencies**: Supabase Auth SDK (`gotrue-kt`).
- **Acceptance Criteria**:
  - Validates session from DataStore on splash.
  - Displays red error banner on invalid login.
  - Preserves deep-link callback handling for OAuth (`com.collegedate.app://auth/callback`).

### Feature 2: Onboarding Setup (`SCR-06`)
- **Status**: Ready for implementation (`OnboardingScreen.kt`).
- **ViewModel**: `OnboardingViewModel.kt`
- **Dependencies**: `ActivityResultContracts.PickVisualMedia` for photo upload, `profiles` table write.
- **Acceptance Criteria**:
  - Enforces 5-step Compose `HorizontalPager`.
  - Validates 18+ eligibility and Nigerian university selection.
  - Requires 1+ profile photo upload before setting `is_onboarded = true`.

### Feature 3: Discovery & Swiping (`SCR-07`)
- **Status**: Ready for implementation (`DiscoveryScreen.kt`).
- **ViewModel**: `DiscoveryViewModel.kt`
- **Dependencies**: `discovery_feed_v3`, Room DB pending swipes, `send_super_swipe` RPC.
- **Acceptance Criteria**:
  - Smooth Compose `Modifier.pointerInput` card fling animations.
  - 60dp touch targets for Like and Pass buttons in lower 35% thumb zone.
  - Instantly invalidates swiped profiles from local deck.
  - Queues swipes locally when offline and syncs when reconnected.

### Feature 4: Messaging & Chat (`SCR-09` & `SCR-10`)
- **Status**: Ready for implementation (`InboxScreen.kt` & `ChatRoomScreen.kt`).
- **ViewModel**: `ChatViewModel.kt`
- **Dependencies**: Supabase Realtime WebSocket subscription (`realtime-kt`), `messages` table.
- **Acceptance Criteria**:
  - Displays unmessaged matches horizontal rail and active conversation list.
  - Real-time message arrival updates list without full re-render.
  - Categorized sticker drawer rendered inside Compose `ModalBottomSheet`.
  - Supports double-tap message quoting.

### Feature 5: Profile Hub & Account Grid (`SCR-11` & `SCR-12`)
- **Status**: Ready for implementation (`ProfileHubScreen.kt` & `EditProfileScreen.kt`).
- **ViewModel**: `ProfileViewModel.kt`
- **Dependencies**: `profiles` table, `profile-photos` storage bucket.
- **Acceptance Criteria**:
  - Displays cover photo header, AI Coach card, and 2x4 visual account grid.
  - All 8 grid tiles navigate cleanly to target sub-routes.
  - Sign Out purges local DataStore and Room DB.

### Feature 6: Premium Monetization (`SCR-13`)
- **Status**: Ready for implementation (`PremiumUpgradeScreen.kt`).
- **ViewModel**: `PremiumViewModel.kt`
- **Dependencies**: RevenueCat Android SDK (`com.revenuecat.purchases:purchases`).
- **Acceptance Criteria**:
  - Fetches `$rc_monthly` package from RevenueCat Android API.
  - Calls `Purchases.sharedInstance.purchasePackage` on CTA tap.
  - Listens for entitlement updates (`Premium` entitlement).

---

## 5. Screens Safe to Implement Immediately

The following screens have 100% complete specifications, zero open blockers, and are cleared for immediate Codex implementation:
1. `SplashScreen.kt` (`SCR-01`)
2. `WelcomeScreen.kt` (`SCR-02`)
3. `LoginScreen.kt` (`SCR-03`)
4. `RegistrationScreen.kt` (`SCR-04`)
5. `PasswordRecoveryScreen.kt` (`SCR-05`)
6. `OnboardingScreen.kt` (`SCR-06`)
7. `ProfileHubScreen.kt` (`SCR-11`)
8. `EditProfileScreen.kt` (`SCR-12`)
9. `SettingsScreen.kt` (`SCR-18`)

---

## 6. Verification & Compliance Notes

- **Architecture, Navigation, Room DB, RPC Contracts, and Acceptance Criteria fully defined.**
- **Stage 11A Codex Engineering Handoff Complete.**
