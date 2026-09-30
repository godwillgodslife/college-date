# Authoritative Native User Flow: The College Date

Date: 2026-08-01  
Target Platform: Native Android (`com.collegedate.app`)  
Scope: Authoritative product navigation, screen flow hierarchy, state branches, and account lifecycle.

---

## 1. Executive Summary

This document defines the complete end-to-end user navigation flow for **The College Date** native Android application. It harmonizes approved live app backend logic with the reconciled Antigravity wireframe layouts across four primary lifecycle stages:
1. **Unauthenticated Flow** (Splash, Auth, Verification, Password Reset)
2. **New-User Onboarding Flow** (Eligibility, Campus, Bio, Photos, Intent)
3. **Main Application Shell Flow** (Discovery, Matches, Chat, Profile Hub, Monetization, Gist)
4. **Account Lifecycle & Security Flow** (Edit Profile, Settings, Logout, Account Deletion, Session Expiry)

---

## 2. Complete Native User Flow Diagrams

### Flow 1: Unauthenticated Flow
```
[App Cold Start]
       │
       ▼
[SplashScreen] ──► (Check Stored Session in DataStore)
       │
       ├──► Valid Session Exists ──► (Check `profiles.is_onboarded`)
       │                                     │
       │                                     ├──► is_onboarded == true  ──► [MainShell / Discovery]
       │                                     └──► is_onboarded == false ──► [OnboardingPager]
       │
       └──► No Session / Expired ──► [WelcomeScreen]
                                         │
                                         ├──► Tap "Sign In" ───────────► [LoginScreen]
                                         │                                    │
                                         │                                    ├──► Submit Credentials ──► [Auth Success] ──► (Route by onboarding)
                                         │                                    ├──► Tap "Forgot Password" ─► [PasswordRecoveryScreen]
                                         │                                    └──► Tap "Google Sign In" ──► [Native OAuth Intent]
                                         │
                                         └──► Tap "Create Account" ────► [RegistrationScreen]
                                                                              │
                                                                              ├──► Has Referral Code? ──► Expand Code Field
                                                                              └──► Submit Signup ────────► [EmailVerificationScreen]
```

#### Key Reconciliation Notes for Unauthenticated Flow:
- **Session Check**: Uses encrypted Android DataStore session cache. No white webview flash.
- **Deep Linking**: Auth callbacks (`com.collegedate.app://auth/callback`) route natively into `AuthViewModel` without web browser popups.

---

### Flow 2: New-User Onboarding Flow
```
[OnboardingPager] (Step Wizard)
       │
       ├──► Step 1: Adult Age Eligibility Check (18+ Confirmation)
       │         │
       │         ▼
       ├──► Step 2: University / Institution Selection (Dropdown from Nigerian Catalog: UNILAG, OAU, UI, FUTA, etc.)
       │         │
       │         ▼
       ├──► Step 3: Department, Faculty, Level & Gender Selection
       │         │
       │         ▼
       ├──► Step 4: Dating Intentions & Interests Chips (Casual 🔥, Serious 💍, Friends 🤝)
       │         │
       │         ▼
       └──► Step 5: Profile Photo Upload (Native Android Photo Picker `PickVisualMedia`)
                 │
                 ▼
       [Complete Onboarding RPC] ──► Sets `is_onboarded = true` ──► Navigates to [MainShell / Discovery]
```

#### Key Reconciliation Notes for New-User Flow:
- **Single CTA per step**: Wireframe principle retained — one clear primary button per step.
- **Progress Indicator**: Persistent top progress bar (`Step X of 5`).
- **Photo Picker**: Replaces web HTML file chooser with native Android System Photo Picker.

---

### Flow 3: Main Application Shell Flow
```
                            [MainShell (Bottom Navigation)]
                                          │
    ┌───────────────────┬─────────────────┼───────────────────┬───────────────────┐
    ▼                   ▼                 ▼                   ▼                   ▼
[Discovery Tab]   [Explore Tab]     [Inbox Tab]         [Confessions]      [Profile Tab]
 (Match / Swipe)  (Campus Grid)    (Recent Chats)       (Campus Gist)      (Account Hub)
    │                   │                 │                   │                   │
    ├── Tap Card        ├── Search Bar    ├── Tap Match Avatar ├── Filter Chips     ├── Edit Profile ──► [EditProfileScreen]
    │    └──► [Profile] ├── Category Chips│    └──► [ChatRoom] │   (Crush, Exams) ├── My Wallet ────► [WalletScreen]
    ├── Swipe Left      └── Tap Card      └── Tap Conversation│   ├── Post Gist    ├── Referrals ────► [ReferralsScreen]
    │    └──► Pass           └──► [Profile]    └──► [ChatRoom]│   └── React Emoji  ├── Settings ─────► [SettingsScreen]
    ├── Swipe Right                               │           │                    ├── Viewers ──────► [ViewersScreen]
    │    └──► Like                                ├── Voice   └── Inline Comments  ├── Leaderboard ──► [LeaderboardScreen]
    │         └──► [Match Modal!]                 │    Call                        └── Premium ──────► [PremiumUpgradeScreen]
    └── Super Swipe                               └── Video                                 └── Logout ───────► [WelcomeScreen]
         └──► Atomic RPC                               Call
```

#### Key Navigation Rules:
- **Bottom Navigation Bar**: Persistent across all 5 main tabs (`Discovery`, `Explore`, `Inbox`, `Confessions`, `Profile`). Displays dynamic badging:
  - *Inbox Tab Badge*: Unread messages count + active incoming call alerts.
  - *Discovery Tab Badge*: New mutual match count.
  - *Profile Tab Badge*: Pending wallet/referral notifications.
- **Top Bar**: Displays app logo, current unread Notification Bell icon (`/notifications`), and Wallet Balance Pill (`/wallet`).

---

### Flow 4: Account Lifecycle & Security Flow
```
[Profile Tab] ──► Tap [Settings]
                      │
                      ├──► Notification Preferences ──► Updates `profiles.notification_settings`
                      ├──► Change Password ───────────► [PasswordChangeDialog]
                      ├──► Become a Partner ──────────► Launches WhatsApp Intent (`wa.me`)
                      ├──► Terms & Privacy ───────────► Launches Native In-App Browser
                      │
                      ├──► Tap [Sign Out] ───────────► Shows Confirmation Dialog
                      │                                      │
                      │                                      └──► Confirmed ──► Clears DataStore, Purges Room DB, Navigates to [WelcomeScreen]
                      │
                      └──► Tap [Delete Account] ──────► Shows Destructive Confirmation Modal
                                                             │
                                                             └──► Confirmed ──► Invokes `delete_user_account` RPC ──► Navigates to [WelcomeScreen]
```

---

## 3. Discrepancies between Live App & Original Wireframes

| Flow Step | Original Wireframe Behavior | Live App Behavior | Authoritative Native Flow Decision |
|---|---|---|---|
| **Auth Redirect** | Direct jump from login to swipe deck. | Checks profile completeness (`hasFullName && hasUniversity && hasPhoto`) & `is_onboarded` flag. | **Follow Live App**: Always evaluate onboarding completeness before entering main shell. |
| **Settings Access** | Accessed via dropdown in top navigation bar. | Consolidated into 2x4 visual account grid on user Profile page. | **Follow Reconciled Baseline**: Settings accessed via Profile page 2x4 account grid. |
| **Photo Upload** | Web dropzone container. | Mobile web input triggering browser file dialog. | **Redesign for Native**: Native Android System Photo Picker (`PickVisualMedia`). |
| **Super Swipe** | Visual card animation. | Invokes atomic `send_super_swipe` RPC with wallet/boost balance validation. | **Follow Live App**: Execute atomic backend RPC with wallet guard. |
| **Call Room** | Text chat only. | WebRTC voice and video calls (`/call/:matchId`). | **Follow Live App**: Native WebRTC voice/video call intent wiring. |

---

## 4. Verification & Compliance Notes

- **Complete User Flow defined** across all 4 operational phases.
- **Navigation rules & state branches documented.**
- **Stage 6 Authoritative Native User Flow Complete.**
