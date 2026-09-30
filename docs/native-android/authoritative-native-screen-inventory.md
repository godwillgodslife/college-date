# Authoritative Native Screen Inventory: The College Date

Date: 2026-08-01  
Target Codebase: `android-native/` (Kotlin + Jetpack Compose)  
Scope: Comprehensive screen inventory contract for implementation by Codex and Antigravity.

---

## 1. Executive Summary

This inventory forms the authoritative implementation contract for all native Android screens in **The College Date**. 

Every screen definition outlines structural requirements, backend dependencies, local Room caching rules, realtime channels, loading/error/offline states, accessibility targets, analytics events, and premium gating parameters.

---

## 2. Native Screen Inventory Contract

### Screen SCR-01: Splash Screen (`SplashScreen.kt`)
- **Screen ID**: `SCR-01`
- **Screen Name**: Splash & Session Router
- **Feature Area**: Auth & Shell Initialization
- **Purpose**: Validates local encrypted DataStore session, checks `profiles.is_onboarded`, and routes user instantly.
- **Entry Points**: Cold app launch, deep link root
- **Exit Points**: `SCR-02` (Welcome), `SCR-06` (Onboarding), `SCR-07` (Discovery Main Shell)
- **Main Components**: Animated Brand Logo, Surface Container, Progress Indicator
- **Primary Action**: Automatic session check & navigation
- **Secondary Actions**: None
- **Required Backend Data**: Supabase Session, `profiles.is_onboarded`
- **Local-Cache Requirement**: Encrypted DataStore session tokens
- **Realtime Requirement**: None
- **Notification Requirement**: None
- **Authentication Requirement**: Public / Mixed
- **Profile-Completion Requirement**: Evaluates `is_onboarded`
- **Premium Requirement**: None
- **States**:
  - *Loading*: Native Animated Splash logo
  - *Empty*: N/A
  - *Error*: Falls back to `SCR-02` (Welcome) if auth session invalid
  - *Offline*: Reads cached session from DataStore; enters offline shell if authenticated
  - *Restricted*: N/A
- **Accessibility Requirements**: Content description for brand logo (`"The College Date logo"`)
- **Analytics Events**: `app_launch`, `session_validated`, `splash_routed`
- **Updated Design Required**: No (Implemented in `feature/splash`).

---

### Screen SCR-02: Welcome Screen (`WelcomeScreen.kt`)
- **Screen ID**: `SCR-02`
- **Screen Name**: Welcome & Brand Gateway
- **Feature Area**: Auth & Onboarding
- **Purpose**: First landing view for logged-out users highlighting student dating culture.
- **Entry Points**: App launch (unauthenticated), logout completion
- **Exit Points**: `SCR-03` (Login), `SCR-04` (Register)
- **Main Components**: Hero Carousel background, Headline typography, "Sign In" button, "Create Account" button
- **Primary Action**: `Create Account` → `SCR-04`
- **Secondary Actions**: `Sign In` → `SCR-03`
- **Required Backend Data**: None
- **Local-Cache Requirement**: None
- **Realtime Requirement**: None
- **Notification Requirement**: None
- **Authentication Requirement**: Public
- **Profile-Completion Requirement**: None
- **Premium Requirement**: None
- **States**:
  - *Loading*: N/A (Static Compose UI)
  - *Offline*: Renders cleanly without network connection
- **Accessibility Requirements**: High contrast text ratios (> 4.5:1), 48dp minimum button touch targets
- **Analytics Events**: `welcome_viewed`, `welcome_click_signup`, `welcome_click_login`
- **Updated Design Required**: No (Implemented in `feature/auth`).

---

### Screen SCR-03: Login Screen (`LoginScreen.kt`)
- **Screen ID**: `SCR-03`
- **Screen Name**: Sign In
- **Feature Area**: Auth
- **Purpose**: Authenticates existing users via email/password or Google OAuth.
- **Entry Points**: `SCR-02` (Welcome)
- **Exit Points**: `SCR-05` (Password Recovery), `SCR-06` (Onboarding), `SCR-07` (Discovery Shell)
- **Main Components**: Header typography, Email OutlinedTextField, Password OutlinedTextField with visibility toggle, Sign In Button, Google Sign In Button, Forgot Password link
- **Primary Action**: `Sign In` (Triggers `signInWithPassword`)
- **Secondary Actions**: `Google Sign In`, `Forgot Password`
- **Required Backend Data**: Supabase Auth (`auth.users`)
- **Local-Cache Requirement**: Saves session to DataStore upon success
- **Realtime Requirement**: None
- **Notification Requirement**: None
- **Authentication Requirement**: Public
- **Profile-Completion Requirement**: Evaluates post-login
- **Premium Requirement**: None
- **States**:
  - *Loading*: Button circular progress indicator during auth call
  - *Error*: Red Material 3 Banner showing auth error copy
  - *Offline*: Displays "No network connection. Please check your internet connection."
- **Accessibility Requirements**: `KeyboardOptions` set to `KeyboardType.Email` and `KeyboardType.Password`, `imePadding()` applied
- **Analytics Events**: `login_viewed`, `login_submitted`, `login_success`, `login_failure`
- **Updated Design Required**: No (Implemented in `feature/auth`).

---

### Screen SCR-04: Registration Screen (`RegistrationScreen.kt`)
- **Screen ID**: `SCR-04`
- **Screen Name**: Create Account
- **Feature Area**: Auth
- **Purpose**: Creates new user auth record and captures optional referral code.
- **Entry Points**: `SCR-02` (Welcome), `SCR-03` (Login)
- **Exit Points**: `SCR-06` (Onboarding), `EmailVerificationScreen`
- **Main Components**: Full Name field, Email field, Password fields, Referral code expander, Terms & Privacy checkboxes, Register button
- **Primary Action**: `Create Account` (Triggers `signUp`)
- **Secondary Actions**: `Toggle Referral Code`, `Sign In instead`
- **Required Backend Data**: Supabase Auth, `validate_referral_code` RPC
- **Local-Cache Requirement**: Saves pending registration state
- **Realtime Requirement**: None
- **Notification Requirement**: Sends verification email if enabled
- **Authentication Requirement**: Public
- **Profile-Completion Requirement**: Moves to `SCR-06` next
- **Premium Requirement**: None
- **States**:
  - *Loading*: Button spinner during `signUp` call
  - *Error*: Inline field validation banners (password length, invalid email)
  - *Offline*: Displays offline error banner
- **Accessibility Requirements**: Auto-focus first input field, proper tab order across fields
- **Analytics Events**: `signup_viewed`, `signup_submitted`, `signup_success`, `signup_failure`
- **Updated Design Required**: No (Implemented in `feature/auth`).

---

### Screen SCR-05: Password Recovery Screen (`PasswordRecoveryScreen.kt`)
- **Screen ID**: `SCR-05`
- **Screen Name**: Forgot Password
- **Feature Area**: Auth
- **Purpose**: Requests password reset email link from Supabase Auth.
- **Entry Points**: `SCR-03` (Login)
- **Exit Points**: `SCR-03` (Login)
- **Main Components**: Lock Header Icon, Instruction body text, Email input field, "Send Reset Link" button, "Back to Login" link
- **Primary Action**: `Send Reset Link` (Triggers `resetPasswordForEmail`)
- **Secondary Actions**: `Back to Login`
- **Required Backend Data**: Supabase Auth
- **Local-Cache Requirement**: None
- **Realtime Requirement**: None
- **Notification Requirement**: Email delivery
- **Authentication Requirement**: Public
- **Profile-Completion Requirement**: N/A
- **Premium Requirement**: None
- **States**:
  - *Loading*: Button loading spinner
  - *Success*: Displays green checkmark banner ("Reset link sent to your email!")
  - *Error*: Red alert banner for un-registered emails
- **Accessibility Requirements**: Clear error announcement via `Semantics`
- **Analytics Events**: `password_recovery_viewed`, `password_recovery_submitted`
- **Updated Design Required**: No (Implemented in `feature/auth`).

---

### Screen SCR-06: Onboarding Setup Wizard (`OnboardingScreen.kt`)
- **Screen ID**: `SCR-06`
- **Screen Name**: Profile Setup Pager
- **Feature Area**: Onboarding
- **Purpose**: 5-step wizard to collect age eligibility, university, department, dating intent, and profile photos.
- **Entry Points**: Registration success, login of un-onboarded user
- **Exit Points**: `SCR-07` (Discovery Main Shell)
- **Main Components**: Top Progress Indicator (`Step X of 5`), Jetpack Compose `HorizontalPager`, Step Card containers, Single primary CTA button per step
- **Steps**:
  1. *Step 1*: 18+ Adult Eligibility Confirmation
  2. *Step 2*: Nigerian University Catalog Dropdown (`UNILAG`, `OAU`, `UI`, `FUTA`, `LASU`, etc.)
  3. *Step 3*: Department, Level & Gender Select
  4. *Step 4*: Dating Intent Chips (`Casual 🔥`, `Serious 💍`, `Friends 🤝`)
  5. *Step 5*: Profile Photo Selector (`PickVisualMedia` Photo Picker)
- **Primary Action**: `Continue →` / `Complete Profile`
- **Secondary Actions**: `Back ←`
- **Required Backend Data**: `profiles` table, `profile-photos` storage bucket
- **Local-Cache Requirement**: Room DB profile table write
- **Realtime Requirement**: None
- **Notification Requirement**: None
- **Authentication Requirement**: Required
- **Profile-Completion Requirement**: Sets `is_onboarded = true` upon completion
- **Premium Requirement**: None
- **States**:
  - *Loading*: Image upload progress bar & profile update RPC spinner
  - *Error*: Inline error message ("Please upload at least 1 photo to continue")
  - *Offline*: Queues onboarding data locally and retries upload when connection is restored
- **Accessibility Requirements**: Native photo picker accessibility, screen reader step announcements
- **Analytics Events**: `onboarding_started`, `onboarding_step_completed`, `onboarding_photo_uploaded`, `onboarding_completed`
- **Updated Design Required**: Yes (Convert web wizard to Compose Pager).

---

### Screen SCR-07: Match / Swipe Discovery (`DiscoveryScreen.kt`)
- **Screen ID**: `SCR-07`
- **Screen Name**: Swipe Discovery
- **Feature Area**: Main Shell / Swiping
- **Purpose**: Primary Tinder-style swipe interface for student profile discovery.
- **Entry Points**: Bottom navigation "Match" tab, App cold start (onboarded user)
- **Exit Points**: `SCR-12` (Profile Detail Drawer), `SCR-10` (Mutual Match Modal -> Chat)
- **Main Components**:
  - Top Bar: Filter button, Compact Swipe Quota Pill (`14 / 20 Swipes`)
  - Swipe Card Deck: High-res profile image, name, age, university, department, distance tag, AI compatibility badge (`89% Match ✨`)
  - Thumb-Zone Action Row: ✕ Pass (60dp), ⭐ Super Swipe (50dp), ❤️ Like (60dp)
  - Mutual Match Popup Dialog: "It's a Match! 🎉" celebration overlay
- **Primary Action**: Swipe Right (Like) / Swipe Left (Pass)
- **Secondary Actions**: Super Swipe, Tap card for bio details, Open filters
- **Required Backend Data**: `discovery_feed_v3` view, `swipes` table, `send_super_swipe` RPC, `check_and_reset_swipe_limit` RPC
- **Local-Cache Requirement**: Room DB discovery cards cache & pending swipe offline queue
- **Realtime Requirement**: Matches channels (`matches` table inserts)
- **Notification Requirement**: Match notification push
- **Authentication Requirement**: Required
- **Profile-Completion Requirement**: Required
- **Premium Requirement**: Premium tier bypasses daily swipe quota
- **States**:
  - *Loading*: Card skeleton shimmer loader
  - *Empty*: "You've reached the end of discovery for today! 🧊 Check back later or expand filters."
  - *Daily Limit Reached*: Modal upsell dialog ("Upgrade to Premium for unlimited swipes!")
  - *Offline*: Serves cached card deck from Room DB; queues pending swipes locally
- **Accessibility Requirements**: VoiceOver/TalkBack actions for Like, Pass, and Super Swipe buttons
- **Analytics Events**: `discovery_viewed`, `profile_swiped_like`, `profile_swiped_pass`, `super_swipe_sent`, `mutual_match_created`
- **Updated Design Required**: Yes (Implement Compose `Modifier.pointerInput` swipe deck with thumb-zone row).

---

### Screen SCR-08: Explore Grid (`ExploreScreen.kt`)
- **Screen ID**: `SCR-08`
- **Screen Name**: Campus Explore & Search Grid
- **Feature Area**: Main Shell / Search
- **Purpose**: Two-column masonry profile grid with live search and category filtering.
- **Entry Points**: Bottom navigation "Explore" tab
- **Exit Points**: `SCR-12` (Profile Detail Drawer), `SCR-11` (Chat Room)
- **Main Components**: Search Bar input, Horizontal Category Filter Chips (`All`, `🔴 Live`, `✨ Newest`, `Near Me`, `Serious 💍`, `Casual 🔥`), Masonry Card Grid (`LazyVerticalStaggeredGrid`), Quick Action Tray (❤️, 💬)
- **Primary Action**: Tap profile card → Open detail drawer
- **Secondary Actions**: Filter by search text, filter by category chip, tap quick like, tap quick chat
- **Required Backend Data**: `profiles` table, `discovery_feed_v3` view
- **Local-Cache Requirement**: Room DB explore cache
- **Realtime Requirement**: Presence tracking (`last_seen_at`)
- **Notification Requirement**: None
- **Authentication Requirement**: Required
- **Profile-Completion Requirement**: Required
- **Premium Requirement**: None
- **States**:
  - *Loading*: Staggered grid skeleton cards
  - *Empty*: "No student profiles found matching your search 🔍"
  - *Offline*: Displays cached explore profiles with offline status bar
- **Accessibility Requirements**: Grid items labeled with student name and campus for screen readers
- **Analytics Events**: `explore_viewed`, `explore_search_performed`, `explore_filter_selected`, `explore_card_tapped`
- **Updated Design Required**: Yes (Implement Compose `LazyVerticalStaggeredGrid`).

---

### Screen SCR-09: Recent Chats Inbox (`InboxScreen.kt`)
- **Screen ID**: `SCR-09`
- **Screen Name**: Messages Inbox
- **Feature Area**: Main Shell / Messaging
- **Purpose**: Central messaging hub listing active conversations and unmessaged mutual matches.
- **Entry Points**: Bottom navigation "Chat" tab
- **Exit Points**: `SCR-11` (Chat Room)
- **Main Components**: Top Search Input, Horizontal New Matches Carousel (`LazyRow`), Active Conversation List (`LazyColumn`), Unread Message Badges, Online Indicators
- **Primary Action**: Tap conversation row → Open `SCR-11`
- **Secondary Actions**: Tap match avatar → Open `SCR-11`, search conversations
- **Required Backend Data**: `matches` table, `messages` table, `profiles` table
- **Local-Cache Requirement**: Room DB conversations & messages cache
- **Realtime Requirement**: Supabase Realtime channel (`matches` & `messages` inserts)
- **Notification Requirement**: Message push notifications
- **Authentication Requirement**: Required
- **Profile-Completion Requirement**: Required
- **Premium Requirement**: None
- **States**:
  - *Loading*: Conversation list skeleton shimmer
  - *Empty*: "No messages yet! Swipe on Match to start connecting 💌"
  - *Offline*: Renders cached conversations from Room DB with offline indicator
- **Accessibility Requirements**: Accessible unread badge counts ("3 unread messages from Amaka")
- **Analytics Events**: `inbox_viewed`, `inbox_conversation_tapped`, `inbox_match_tapped`
- **Updated Design Required**: Yes (Implement Compose `LazyColumn` + `LazyRow`).

---

### Screen SCR-10: Individual Chat Room (`ChatRoomScreen.kt`)
- **Screen ID**: `SCR-10` / `SCR-11`
- **Screen Name**: Direct Message & Voice/Video Call Room
- **Feature Area**: Messaging
- **Purpose**: Real-time 1-on-1 text chat, voice notes, stickers, smart replies, and call triggers.
- **Entry Points**: `SCR-09` (Inbox), Match modal
- **Exit Points**: `SCR-12` (Partner Profile), `VoiceCallRoom`
- **Main Components**:
  - Top App Bar: Partner avatar, name, online status, Voice Call button (📞), Video Call button (📹)
  - Message Thread Stream: Sent vs Received bubbles, timestamps, read checkmarks
  - Quoted Reply Banner: Attached above composer
  - AI Smart Reply Strip: Horizontally scrollable suggestion chips
  - WhatsApp-style Composer: Full-width text field, Emoji drawer button, Camera button, Send/Voice record action
  - Categorized Sticker Drawer (`ModalBottomSheet`): Emojis + Nigerian Campus Stickers ("Oversabi", "No Wahala", "Chop Life")
- **Primary Action**: `Send Message`
- **Secondary Actions**: Tap Smart Reply chip, double-tap message to quote, toggle sticker drawer, tap call icon
- **Required Backend Data**: `messages` table, `chat-media` storage bucket, `chatService.js` RPCs
- **Local-Cache Requirement**: Room DB message thread cache & pending send queue
- **Realtime Requirement**: Supabase Realtime channel for `messages` inserts & updates
- **Notification Requirement**: In-app & FCM push notifications
- **Authentication Requirement**: Required
- **Profile-Completion Requirement**: Required
- **Premium Requirement**: Some premium features (unlimited voice call minutes)
- **States**:
  - *Loading*: Thread message history spinner
  - *Offline*: Displays cached messages; marks unsent messages as "Pending delivery 🕒"
- **Accessibility Requirements**: TalkBack announcements for incoming messages, `imePadding()` handling
- **Analytics Events**: `chat_room_opened`, `message_sent`, `smart_reply_used`, `sticker_sent`, `call_initiated`
- **Updated Design Required**: Yes (Implement Compose `Scaffold` + `LazyColumn` + `ModalBottomSheet` sticker drawer).

---

### Screen SCR-11: Profile & Account Hub (`ProfileHubScreen.kt`)
- **Screen ID**: `SCR-11` / `SCR-12`
- **Screen Name**: Profile Dashboard & Account Command Center
- **Feature Area**: Main Shell / Profile
- **Purpose**: Displays user's profile details, AI Profile Coach recommendations, and 2x4 visual account grid.
- **Entry Points**: Bottom navigation "Profile" tab
- **Exit Points**: `SCR-13` (Edit Profile), `SCR-14` (Premium), `SCR-15` (Wallet), `SCR-16` (Referrals), `SCR-17` (Leaderboard), `SCR-18` (Settings), `SCR-19` (Viewers), `SCR-02` (Logout -> Welcome)
- **Main Components**: Cover Photo Header with Verification Badges (🎓, 💙), Name, Campus details, AI Profile Coach Card, 2x4 Account Grid (`LazyVerticalGrid`), Photo Gallery Grid
- **Primary Action**: Tap Account Grid tiles (Edit Profile, Wallet, Referrals, Settings, Viewers, Leaderboard, Premium, Logout)
- **Secondary Actions**: Tap photos to view full size
- **Required Backend Data**: `profiles` table, `subscriptions` table, `wallets` table
- **Local-Cache Requirement**: Room DB user profile cache
- **Realtime Requirement**: Presence tracking (`update_user_presence`)
- **Notification Requirement**: None
- **Authentication Requirement**: Required
- **Profile-Completion Requirement**: Required
- **Premium Requirement**: Displays Premium badge status
- **States**:
  - *Loading*: Profile skeleton loader
  - *Offline*: Renders cached profile data from Room DB
- **Accessibility Requirements**: Grid tiles with clear labels and touch targets > 48dp
- **Analytics Events**: `profile_hub_viewed`, `profile_account_tile_tapped`, `ai_coach_action_tapped`
- **Updated Design Required**: Yes (Implement Compose `LazyColumn` with nested `LazyVerticalGrid`).

---

### Screen SCR-12: Edit Profile (`EditProfileScreen.kt`)
- **Screen ID**: `SCR-12` / `SCR-13`
- **Screen Name**: Edit Profile & Photos
- **Feature Area**: Profile
- **Purpose**: Updates profile bio, photos, department, level, and interests.
- **Entry Points**: `SCR-11` (Profile Hub)
- **Exit Points**: `SCR-11` (Profile Hub)
- **Main Components**: 6-Slot Photo Upload Grid, Bio Textarea (with char counter 0/300), Department input, Level select, Interest Chips picker, AI Bio Generator button, Save Profile Sticky CTA
- **Primary Action**: `Save Changes`
- **Secondary Actions**: Upload Photo (`PickVisualMedia`), Delete Photo, Generate AI Bio
- **Required Backend Data**: `profiles` table, `profile-photos` storage bucket
- **Local-Cache Requirement**: Room DB profile update
- **Realtime Requirement**: None
- **Notification Requirement**: None
- **Authentication Requirement**: Required
- **Profile-Completion Requirement**: Required
- **Premium Requirement**: None
- **States**:
  - *Loading*: Image upload progress bar & RPC save spinner
  - *Error*: Validation banner ("At least 1 photo required")
- **Accessibility Requirements**: Auto-announce image upload completion
- **Analytics Events**: `edit_profile_viewed`, `profile_photo_added`, `profile_photo_deleted`, `profile_saved`
- **Updated Design Required**: Yes (Implement Compose Edit Profile screen with native photo picker).

---

### Screen SCR-13: Premium Upgrade (`PremiumUpgradeScreen.kt`)
- **Screen ID**: `SCR-13` / `SCR-14`
- **Screen Name**: Premium Shop & Entitlements
- **Feature Area**: Monetization
- **Purpose**: Manages Google Play billing subscriptions via RevenueCat Android SDK (`com.revenuecat.purchases`).
- **Entry Points**: Profile Hub "Upgrade to Premium", Match swipe limit modal, Viewers blur card
- **Exit Points**: RevenueCat Google Play billing sheet, `SCR-11` (Profile Hub)
- **Main Components**: Crown Hero Gradient Banner, Feature Comparison Checklist, Subscription Plan Selector Cards (`$rc_monthly`), Direct Consumable Purchase Cards (Super Swipes, Boosts), Restore Purchases Button
- **Primary Action**: `Upgrade Now` (Triggers `Purchases.sharedInstance.purchasePackage`)
- **Secondary Actions**: Select Plan, Restore Purchases, Buy Consumable Boost
- **Required Backend Data**: `subscriptions` table, RevenueCat Android API key, `revenuecat-webhook` Edge Function
- **Local-Cache Requirement**: Encrypted DataStore entitlement cache
- **Realtime Requirement**: RevenueCat listener
- **Notification Requirement**: Payment success push
- **Authentication Requirement**: Required
- **Profile-Completion Requirement**: Required
- **Premium Requirement**: Shows active subscription details if user is already Premium
- **States**:
  - *Loading*: RevenueCat offerings fetch progress bar
  - *Active Premium User*: "You are a Premium Member! 👑 Valid until [Date]"
  - *Error*: Google Play Billing error alert dialog
- **Accessibility Requirements**: Clear price announcements for screen readers
- **Analytics Events**: `premium_shop_viewed`, `plan_selected`, `purchase_initiated`, `purchase_completed`, `purchase_failed`
- **Updated Design Required**: Yes (Implement Native Compose Premium screen with RevenueCat Android SDK integration).

---

### Screen SCR-14: Wallet & Ledger (`WalletScreen.kt`)
- **Screen ID**: `SCR-14` / `SCR-15`
- **Screen Name**: Student Wallet & Financial Ledger
- **Feature Area**: Monetization / Wallet
- **Purpose**: Displays Naira balance, transaction history, Paystack funding, and bank withdrawal requests.
- **Entry Points**: Profile Hub "My Wallet", Top app bar wallet badge
- **Exit Points**: Paystack deposit intent, Withdrawal request modal
- **Main Components**: Naira Balance Card (`₦X,XXX.XX`), Total Earned Card, Action Buttons (Fund Wallet, Withdraw), Transaction Ledger List (`LazyColumn`), Withdrawal Bottom Sheet Modal
- **Primary Action**: `Fund Wallet` / `Withdraw`
- **Secondary Actions**: View transaction details
- **Required Backend Data**: `wallets` table, `wallet_transactions` table, bank lookup RPC
- **Local-Cache Requirement**: Room DB wallet cache
- **Realtime Requirement**: Wallet balance updates
- **Notification Requirement**: Payment & withdrawal push
- **Authentication Requirement**: Required
- **Profile-Completion Requirement**: Required
- **Premium Requirement**: None
- **States**:
  - *Loading*: Ledger skeleton rows
  - *Empty*: "No wallet transactions recorded yet."
  - *Offline*: Read-only cached balance display
- **Accessibility Requirements**: Currency amounts formatted clearly for TalkBack (`"Balance: 3,500 Nigerian Naira"`)
- **Analytics Events**: `wallet_viewed`, `fund_wallet_clicked`, `withdrawal_requested`
- **Updated Design Required**: Yes (Implement Compose Wallet screen).

---

### Screen SCR-15: Referrals & Rewards (`ReferralsScreen.kt`)
- **Screen ID**: `SCR-15` / `SCR-16`
- **Screen Name**: Referral Program & Rewards
- **Feature Area**: Growth & Economy
- **Purpose**: Displays referral code, share link, total earnings, and invited friend list.
- **Entry Points**: Profile Hub "Referrals"
- **Exit Points**: Android Native Share Sheet (`Intent.ACTION_SEND`)
- **Main Components**: Referral Banner ("Earn ₦500 per friend"), Referral Code Display Box, Copy Code Button, Share Link Button, Referral Stats Overview, Referred Friends List
- **Primary Action**: `Share Invite Link` (Triggers native Android Share Intent)
- **Secondary Actions**: `Copy Code` (Copies code to Android ClipboardManager)
- **Required Backend Data**: `referrals` table, `validate_referral_code` RPC, `apply_referral_code` RPC
- **Local-Cache Requirement**: Room DB referral cache
- **Realtime Requirement**: None
- **Notification Requirement**: Referral reward notification
- **Authentication Requirement**: Required
- **Profile-Completion Requirement**: Required
- **Premium Requirement**: None
- **States**:
  - *Loading*: Referral stats spinner
  - *Empty Friends*: "No friends invited yet. Share your code to start earning!"
- **Accessibility Requirements**: Copy button announces "Referral code copied to clipboard"
- **Analytics Events**: `referrals_viewed`, `referral_code_copied`, `referral_link_shared`
- **Updated Design Required**: Yes (Implement Compose Referrals screen with native Android Share Intent).

---

### Screen SCR-16: Campus Confessions (`ConfessionsScreen.kt`)
- **Screen ID**: `SCR-16` / `SCR-17`
- **Screen Name**: Anonymous Campus Confessions & Gist
- **Feature Area**: Social / Campus Life
- **Purpose**: Browse anonymous campus posts, react with multi-emoji breakdown, and submit new confessions.
- **Entry Points**: Bottom navigation "Confessions" tab, Dashboard CTA
- **Exit Points**: Post confession modal, Comment bottom sheet
- **Main Components**: Category Filter Chips (`All`, `General`, `Crush 💌`, `Lecturers 👨‍🏫`, `Exams 📚`, `Cafeteria 🍔`), Floating Action Button (+), Confession Post Cards with interactive multi-emoji reaction strip (🔥, 😂, 🙊, 🙏, 😢)
- **Primary Action**: `Post Confession`
- **Secondary Actions**: React to post with emoji, view comments, filter by category
- **Required Backend Data**: `confessions` table, `confession_reactions` table, `optimized_confessions` view
- **Local-Cache Requirement**: Room DB confessions feed cache
- **Realtime Requirement**: Confession reaction updates
- **Notification Requirement**: Moderation push notifications
- **Authentication Requirement**: Required
- **Profile-Completion Requirement**: Required
- **Premium Requirement**: None
- **States**:
  - *Loading*: Feed skeleton shimmer
  - *Empty*: "No campus confessions posted yet! Be the first to share the gist 🙊"
  - *Offline*: Serves cached feed from Room DB
- **Accessibility Requirements**: Reaction buttons with clear emoji descriptions
- **Analytics Events**: `confessions_viewed`, `confession_posted`, `confession_reacted`
- **Updated Design Required**: Yes (Implement Compose Confessions screen with `LazyColumn` + `FloatingActionButton`).

---

### Screen SCR-17: Leaderboard (`LeaderboardScreen.kt`)
- **Screen ID**: `SCR-17` / `SCR-18`
- **Screen Name**: Campus Popularity Leaderboard
- **Feature Area**: Social / Growth
- **Purpose**: Displays student popularity rankings, top 3 podium crowns, and category filters.
- **Entry Points**: Profile Hub "Leaderboard", Dashboard card
- **Exit Points**: `SCR-12` (User Profile Drawer)
- **Main Components**: Period Segmented Control (`This Week`, `This Month`, `All Time`), Podium Top 3 View (Gold #1, Silver #2, Bronze #3), Ranked List Rows (ranks 4-50)
- **Primary Action**: Tap rank row → Open user profile drawer
- **Secondary Actions**: Switch period tab, switch category filter
- **Required Backend Data**: `leaderboard_unified` view
- **Local-Cache Requirement**: Room DB leaderboard cache
- **Realtime Requirement**: None
- **Notification Requirement**: None
- **Authentication Requirement**: Required
- **Profile-Completion Requirement**: Required
- **Premium Requirement**: None
- **States**:
  - *Loading*: Podium & list skeleton loader
  - *Empty*: "Leaderboard rankings compiling..."
  - *Offline*: Read-only cached rankings from Room DB
- **Accessibility Requirements**: Rank numbers and scores announced explicitly for screen readers
- **Analytics Events**: `leaderboard_viewed`, `leaderboard_tab_changed`, `leaderboard_profile_tapped`
- **Updated Design Required**: Yes (Implement Compose Leaderboard screen).

---

### Screen SCR-18: Settings & Security (`SettingsScreen.kt`)
- **Screen ID**: `SCR-18` / `SCR-19`
- **Screen Name**: Settings & Account Life-cycle
- **Feature Area**: Settings & Security
- **Purpose**: Manages notification preferences, partner WhatsApp contact, sign out, and account deletion.
- **Entry Points**: Profile Hub "Settings"
- **Exit Points**: WhatsApp Intent, `SCR-02` (Welcome on logout)
- **Main Components**: Account Settings Group (Email, Password, Push Notification Toggles), Support & Partner Group (WhatsApp Support Link), Account Lifecycle Group (Sign Out Button, Red Delete Account Button with confirmation dialog), App Version Footnote ("The College Date v2.2.36")
- **Primary Action**: `Sign Out` / `Delete Account`
- **Secondary Actions**: Toggle notification settings, open WhatsApp partner link
- **Required Backend Data**: `profiles.notification_settings`, `delete_user_account` RPC
- **Local-Cache Requirement**: Encrypted DataStore clear on sign out
- **Realtime Requirement**: None
- **Notification Requirement**: Revokes notification device token on sign out
- **Authentication Requirement**: Required
- **Profile-Completion Requirement**: Required
- **Premium Requirement**: None
- **States**:
  - *Loading*: Sign out progress indicator
  - *Error*: Logout/deletion error alert dialog
- **Accessibility Requirements**: High contrast destructive buttons, clear dialog warnings
- **Analytics Events**: `settings_viewed`, `notification_toggle_changed`, `signout_clicked`, `delete_account_requested`
- **Updated Design Required**: No (Implemented in `feature/settings`).

---

### Screen SCR-19: Viewers & Admirers (`ViewersScreen.kt`)
- **Screen ID**: `SCR-19` / `SCR-20`
- **Screen Name**: Who Viewed Me & Secret Admirers
- **Feature Area**: Discovery & Monetization
- **Purpose**: Displays list of users who viewed or liked the user's profile (blurred for free tier, unblurred for Premium).
- **Entry Points**: Profile Hub "Who Viewed Me", Dashboard Admirers banner
- **Exit Points**: `SCR-12` (User Profile Drawer), `SCR-13` (Premium Upgrade)
- **Main Components**: Tab Bar (`Who Viewed Me 👀`, `Likes You ❤️`), Viewer Cards List (Blurred photo + Lock overlay for free tier, sharp photo for Premium), Unlock Premium Upsell Banner
- **Primary Action**: `Unlock Premium` (Free users) / `Accept Admirer` (Premium users)
- **Secondary Actions**: Tap viewer card to open profile
- **Required Backend Data**: `get_profile_viewers_secure` RPC, `get_admirers_secure` RPC
- **Local-Cache Requirement**: Room DB viewers cache
- **Realtime Requirement**: Likes/views notifications
- **Notification Requirement**: View notification push
- **Authentication Requirement**: Required
- **Profile-Completion Requirement**: Required
- **Premium Requirement**: Unlocks clear photos and direct accept button
- **States**:
  - *Loading*: Viewer list skeleton loader
  - *Free Tier Locked State*: Displays blurred profile cards with lock overlay and Premium CTA
  - *Premium Unlocked State*: Displays full profile cards with direct "Accept Like" button
- **Accessibility Requirements**: Clear state announcements for locked vs unlocked viewers
- **Analytics Events**: `viewers_screen_viewed`, `viewers_upsell_clicked`, `admirer_accepted`
- **Updated Design Required**: Yes (Implement Compose Viewers screen with blur graphics layer).

---

## 3. Verification & Compliance Notes

- **All 19 Native Screens fully specified** with Screen ID, name, purpose, entry/exit points, components, actions, data sources, Room caching, realtime, notifications, loading/empty/error/offline states, accessibility, and analytics events.
- **Stage 7 Authoritative Native Screen Inventory Complete.**
