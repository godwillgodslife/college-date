# Live App Screen Inventory: The College Date (Capacitor Web Wrapper)

Date: 2026-08-01  
Target App Version: `2.2.36` (`versionCode 33`)  
Package Name: `com.collegedate.app`  
Scope: Screen-by-screen inventory of the live application running in the Capacitor WebView shell.

---

## 1. Inventory Overview

The live application is built with React 18, Vite, React Router v6, and Tailwind/Vanilla CSS, delivered to Android users inside a Capacitor WebView container (`com.collegedate.app`).

This inventory captures the complete operational state, components, navigation hierarchy, interactive controls, state handling, and web-wrapper artifacts across all 20+ live screens.

---

## 2. Screen-by-Screen Inventory

### Screen 1: Splash / Smart Home Route (`/`)
- **Screen Name**: Smart Home Launcher / Splash Gate
- **Entry Point**: App launch, cold start, deep link root
- **Navigation Destination**: `/mini-profile-setup` (if un-onboarded), `/dashboard` (if onboarded), `/login` or `/` Landing (if unauthenticated), `/admin` (if admin)
- **Visible Components**: Centered logo badge, dark gradient background, loading spinner fallback
- **Buttons / Actions**: None (automated redirect)
- **Form Fields**: None
- **Navigation Behavior**: Top/Bottom nav hidden during auth evaluation
- **State Handling**:
  - *Loading*: `<LoadingSpinner fullScreen />` rendered during Supabase `onAuthStateChange` session check
  - *Error*: Shows fallback landing screen if session check fails or times out
  - *Offline*: Shows cached auth state from `localStorage` / Capacitor Preferences; falls back to offline banner if unauthenticated
- **Web-Wrapper Behaviors Observed**: Slight white flash before web CSS loads; browser history replacement (`<Navigate replace />`).

---

### Screen 2: Public Landing Page (`/` when unauthenticated)
- **Screen Name**: Public Landing Page
- **Entry Point**: App launch when logged out, direct web URL
- **Navigation Destination**: `/login`, `/signup`, `/wireframes`, external store links (`play.google.com`, Instagram)
- **Visible Components**: Brand top bar, Hero banner with student dating tagline, Interactive profile showcase preview mockup (Amaka, Tunde, Zainab slides), Campus Focus grid, Store badges (Google Play & Instagram), Footer links
- **Buttons / Actions**:
  - `Get Started` / `Create Account` → `/signup`
  - `Sign In` → `/login`
  - `View Wireframes` → `/wireframes`
  - `Google Play Badge` → External link to Play Store (`https://play.google.com/store/apps/details?id=com.collegedate.app`)
  - `Instagram Badge` → External link to Instagram (`https://www.instagram.com/thecollegedate`)
- **Form Fields**: None
- **Navigation Behavior**: Sticky header navigation bar; no bottom navigation bar
- **Modals / Sheets**: None
- **State Handling**: Static content with interactive preview carousel
- **Web-Wrapper Behaviors Observed**: Standard web page scrolling; external links open via browser or intent.

---

### Screen 3: Login (`/login`)
- **Screen Name**: Sign In
- **Entry Point**: Landing page "Sign In", logout, protected route redirect
- **Navigation Destination**: `/dashboard`, `/mini-profile-setup`, `/signup`, `/forgot-password`, Google OAuth callback
- **Visible Components**: Logo header, email/password form card, "Sign in with Google" button, "Forgot Password?" link, "Don't have an account? Sign Up" footer link
- **Buttons / Actions**:
  - `Sign In` (Primary CTA)
  - `Continue with Google` (OAuth CTA)
  - `Forgot Password?` → `/forgot-password`
  - `Sign Up` → `/signup`
- **Form Fields**: Email address input (`type="email"`), Password input (`type="password"`, toggle visibility icon)
- **Navigation Behavior**: No top/bottom nav bar
- **Keyboard Behavior**: Soft keyboard pushes input upward; lower button may get covered on smaller Android screens (360dp width)
- **State Handling**:
  - *Loading*: Disabled button with inline spinner during `signInWithPassword`
  - *Error*: Red alert callout banner showing Supabase auth error message (e.g., "Invalid login credentials")
  - *Offline*: Shows error toast "Network unavailable, please check your internet connection"
- **Web-Wrapper Behaviors Observed**: Google OAuth launches Capacitor Browser plugin (`com.collegedate.app://auth/callback`); OAuth redirect sometimes experiences brief white callback screen.

---

### Screen 4: Registration (`/signup`)
- **Screen Name**: Create Account
- **Entry Point**: Landing page "Get Started", Login page "Sign Up"
- **Navigation Destination**: `/mini-profile-setup`, `/login`, Google OAuth callback
- **Visible Components**: Header logo, multi-field form card, referral code expander toggle, Google OAuth button, Terms & Privacy checkboxes
- **Buttons / Actions**:
  - `Create Account` (Primary CTA)
  - `Have a referral code?` (Collapsible toggle)
  - `Sign in with Google` (OAuth CTA)
  - `Already have an account? Log in` → `/login`
- **Form Fields**: Full Name, Email, Password, Confirm Password, Referral Code (optional)
- **Navigation Behavior**: No top/bottom nav bar
- **Keyboard Behavior**: Standard browser input focusing; long form requires vertical scrolling
- **State Handling**:
  - *Loading*: Button spinner during `signUp` RPC & auth call
  - *Error*: Validation error messages under specific inputs (password length < 6, mismatched passwords) or top error banner
  - *Offline*: Sign up disabled with offline notification
- **Web-Wrapper Behaviors Observed**: DOM input validation messages; browser autocomplete popups.

---

### Screen 5: Password Recovery (`/forgot-password` & `/reset-password`)
- **Screen Name**: Forgot / Reset Password
- **Entry Point**: Login screen "Forgot Password?", deep link from email
- **Navigation Destination**: `/login`
- **Visible Components**: Lock icon, instructions card, email input field, "Send Reset Link" button, "Back to Login" link
- **Buttons / Actions**: `Send Reset Link`, `Back to Login`
- **Form Fields**: Email address
- **State Handling**: Success banner ("Password reset link sent to your email"), error banner if email is not found
- **Web-Wrapper Behaviors Observed**: Standard web form submission.

---

### Screen 6: Onboarding Setup (`/mini-profile-setup`)
- **Screen Name**: Profile Setup Wizard
- **Entry Point**: Auto-directed after new user registration/login if `is_onboarded` is false
- **Navigation Destination**: `/dashboard` upon completion
- **Visible Components**: Multi-step wizard card, step progress dots, step indicator text ("Step X of Y"), step navigation buttons (Back, Continue/Complete)
- **Steps Included**:
  1. *Step 1*: Adult Age Eligibility check (18+ confirmation)
  2. *Step 2*: University / Institution Selection (Dropdown containing Nigerian universities & polytechnics: UNILAG, OAU, UI, FUTA, LASU, COVENANT, etc.)
  3. *Step 3*: Department, Faculty, Level & Gender
  4. *Step 4*: Dating Intentions & Interests (Casual 🔥, Serious 💍, Friends 🤝, Chips picker)
  5. *Step 5*: Profile Photo Upload (Primary photo upload dropzone with avatar preview)
- **Buttons / Actions**: `Next Step`, `Previous Step`, `Complete Profile`
- **Form Fields**: University dropdown, Department text, Level select, Gender select, Bio text area, Photo file selector
- **Navigation Behavior**: Top & Bottom nav hidden during onboarding flow
- **Keyboard Behavior**: Auto-focuses active input field on step change
- **State Handling**:
  - *Loading*: Profile update RPC & image upload progress spinner
  - *Error*: Input validation error messages (e.g. "At least 1 profile photo is required")
- **Web-Wrapper Behaviors Observed**: HTML `<input type="file" accept="image/*">` triggers Android webview file picker dialog rather than native Android photo picker API.

---

### Screen 7: Dashboard (`/dashboard`)
- **Screen Name**: Main Command Center / Feed Summary
- **Entry Point**: App launch for authenticated onboarded users, bottom nav "Home" tab
- **Navigation Destination**: `/match`, `/explore`, `/chat`, `/confessions`, `/leaderboard`, `/profile`, `/wallet`, `/premium`
- **Visible Components**:
  - Top header with brand logo, notifications bell icon with unread badge, wallet balance badge
  - Quick Action Hero Cards: "Find Your Match" (Swipe CTA), "Campus Confessions" (Gist feed CTA), "Leaderboard" (Rankings CTA)
  - Daily Vibe / Quote card
  - Recent Admirers / Viewers preview carousel (blurred for free users with Premium lock overlay)
  - Persistent Bottom Navigation Bar (Home, Swipe, Explore, Chat, Profile)
- **Buttons / Actions**:
  - `Swipe Now` → `/match`
  - `Read Confessions` → `/confessions`
  - `View Leaderboard` → `/leaderboard`
  - `Unlock Admirers` → `/premium`
  - `Bell Icon` → `/notifications`
  - `Wallet Badge` → `/wallet`
- **Navigation Behavior**: Bottom Navigation visible with active highlight on Home icon
- **State Handling**:
  - *Loading*: SWR cached profile/wallet data displays instantly; skeleton loaders for dynamic feeds
  - *Empty*: Placeholder cards for zero admirers or zero new matches
  - *Offline*: Displays cached dashboard stats with an amber "Offline mode — showing cached data" banner at top
- **Web-Wrapper Behaviors Observed**: Web SWR revalidation on window focus; pull-to-refresh emulated via web touch events.

---

### Screen 8: Match / Swipe (`/match`)
- **Screen Name**: Tinder-style Swipe Discovery
- **Entry Point**: Bottom navigation "Match" icon, Dashboard "Swipe Now" CTA
- **Navigation Destination**: `/profile/:userId` (Profile details drawer), `/chat/:chatId` (Match Modal "Send Message" CTA)
- **Visible Components**:
  - Top bar: Filter button (⚙️), Swipe Quota Counter ("X / 20 Swipes remaining" or "∞ Premium Swipes")
  - Central Swipe Card Deck: High-resolution profile photo, Name, Age, University, Department, Distance/Location tag, AI Compatibility Badge (e.g., "89% Match")
  - Expandable Profile Details: Bio, Interests chips, Dating goal, Voice intro player (if available)
  - Thumb-Zone Action Row: 
    - ✕ Pass (Red circular button)
    - ⭐ Super Swipe (Gold star button — costs wallet balance or super swipe grant)
    - ❤️ Like (Green heart button)
  - Mutual Match Popup Modal: Fullscreen celebration modal with confetti animation when mutual like occurs ("It's a Match! 🎉")
- **Buttons / Actions**:
  - `Pass Button (✕)` → Triggers left swipe animation and records pass
  - `Super Swipe (⭐)` → Prompts confirmation modal or executes atomic `send_super_swipe` RPC
  - `Like Button (❤️)` → Triggers right swipe animation and checks mutual match
  - `Undo / Rewind` → Premium-only action to revert last pass
  - `Profile Card Tap` → Expands profile bio & detail drawer
- **Gestures**: Touch drag left (Pass), touch drag right (Like), touch drag up (Super Swipe)
- **State Handling**:
  - *Loading*: Profile card skeleton loader while fetching next batch from `discovery_feed_v3`
  - *Empty State*: "You've reached the end of discovery for today! 🧊 Check back later or expand your distance filters."
  - *Daily Limit Reached*: Modal upsell banner ("Daily swipe limit reached. Upgrade to Premium for unlimited swipes!")
  - *Offline*: Queues pending swipes in local storage and processes via RPC when reconnected
- **Web-Wrapper Behaviors Observed**: Framer-motion CSS transform animation for swipes; occasional touch drag jitter on lower-end Android WebView devices.

---

### Screen 9: Explore / Discovery Grid (`/explore`)
- **Screen Name**: Campus Explore & Search Grid
- **Entry Point**: Bottom navigation "Explore" icon
- **Navigation Destination**: `/profile/:userId`, Filter modal
- **Visible Components**:
  - Search Bar input ("Search by name, school, department...")
  - Filter category chips: `All`, `🔴 Live Now`, `✨ Newest`, `Near Me`, `Serious 💍`, `Casual 🔥`
  - Profile Grid: Masonry-style two-column card grid showing profile photo, online indicator dot, name, university, and quick-action overlay buttons (❤️, 💬)
  - Search filter modal (Age range slider, University filter dropdown, Intent filter)
- **Buttons / Actions**:
  - `Category Chip Tap` → Filters active profile list
  - `Quick Like (❤️)` → Triggers instant like RPC
  - `Quick Chat (💬)` → Opens direct message or match check
  - `Filter Icon (⚙️)` → Opens Filter Bottom Sheet
- **Form Fields**: Search input text field
- **State Handling**:
  - *Loading*: Skeleton grid cards
  - *Empty*: "No student profiles found matching your search criteria 🔍"
- **Web-Wrapper Behaviors Observed**: Continuous scroll using web `IntersectionObserver`.

---

### Screen 10: Recent Chats / Inbox (`/chat` or `/messages`)
- **Screen Name**: Messages & Matches Inbox
- **Entry Point**: Bottom navigation "Chat" icon with unread badge count
- **Navigation Destination**: `/chat/:matchId` (Individual Chat Room)
- **Visible Components**:
  - Top Header: "Messages", Search conversation input
  - New Matches Horizontal Carousel: Circular avatars of recent mutual matches who haven't been messaged yet (with pink ring highlight)
  - Active Conversations List: Conversation rows featuring user avatar, online status dot, partner name, last message snippet, timestamp, and unread badge count
- **Buttons / Actions**:
  - `Match Avatar Tap` → Opens new chat conversation room
  - `Conversation Row Tap` → Opens active chat room (`/chat/:matchId`)
- **State Handling**:
  - *Loading*: Skeleton conversation rows
  - *Empty*: "No messages yet! Swipe on Match to start connecting with campus students 💌"
- **Web-Wrapper Behaviors Observed**: SWR real-time polling combined with Supabase Realtime channel subscription.

---

### Screen 11: Individual Chat Room (`/chat/:matchId`)
- **Screen Name**: Direct Message & Voice Call Room
- **Entry Point**: Inbox conversation tap, Match modal "Send Message"
- **Navigation Destination**: `/profile/:matchId` (Partner profile), `/call/:matchId` (Voice/Video Call Room)
- **Visible Components**:
  - Chat App Bar: Partner avatar, partner name, online/last-seen status indicator ("Online" or "Last seen 5m ago"), Voice Call button (📞), Video Call button (📹), More options menu (⋮)
  - Message Thread View: Chronological message bubbles (sent vs received styling), timestamp, read receipt checkmarks (✓✓)
  - Quoted Reply Banner: Styled preview above composer showing quoted message text when replying
  - Smart Reply Strip: Horizontally scrollable AI suggested reply chips above composer ("Hey there! 👋", "What department are you in?", "Free for lunch at CAF?")
  - WhatsApp-style Composer Row:
    - Sticker / Emoji drawer toggle button (😀)
    - Media attachment button (📷)
    - Full-width text input field ("Type a message...")
    - Voice note recording button (🎙️) / Send message button (🚀)
  - Expanded Sticker / Emoji Drawer (`StickerDrawer.jsx`): Categorized emoji keyboard (People, Love, Fun, Nature, Food, Campus) + Nigerian Campus Stickers ("Oversabi 🧐", "No Wahala 😌", "Chop Life 🍗", "God When? 🥺")
- **Buttons / Actions**:
  - `Send Button` → Inserts message into `messages` table via `chatService.js` and sends push notification
  - `Smart Reply Chip Tap` → Auto-fills composer text and sends immediately
  - `Double Tap Message` → Sets message as quoted reply target
  - `Voice Call (📞)` → Navigates to `/call/:matchId?type=voice`
  - `Video Call (📹)` → Navigates to `/call/:matchId?type=video`
  - `Emoji Drawer Toggle` → Slides up categorized emoji drawer above composer
- **Form Fields**: Message text input field
- **Keyboard Behavior**: Webview resizes height; input stays attached to keyboard top via `--vh` custom CSS property
- **State Handling**:
  - *Loading*: Chat thread spinner while fetching historical messages
  - *Offline*: Local message queuing with amber "Pending" delivery status indicator
- **Web-Wrapper Behaviors Observed**: Web-based StickerDrawer component positioning (`position: absolute; bottom: 80px`); manual viewport height adjustment (`--vh`).

---

### Screen 12: Profile Dashboard & Account Hub (`/profile` & `/profile/:userId`)
- **Screen Name**: User Profile & Account Management Hub
- **Entry Point**: Bottom navigation "Profile" icon, user avatar taps
- **Navigation Destination**: `/profile/edit`, `/wallet`, `/referrals`, `/settings`, `/leaderboard`, `/premium`, `/viewers`
- **Visible Components**:
  - Cover Photo / Profile Photo Header with verifications badges (AI Verified badge 💙, Campus Verified badge 🎓)
  - User Name, Age, University, Department, Level, Bio
  - AI Profile Coach Card: Inline recommendation widget providing profile score ("Profile Strength: 85%") and improvement tips
  - Visual Account Hub Grid (2x4 Action Grid):
    - `Edit Profile ✏️` → Navigates to `/profile/edit`
    - `My Wallet 👛` → Navigates to `/wallet` (displays current Naira balance)
    - `Referrals 🎁` → Navigates to `/referrals` (displays referral count & earnings)
    - `Settings ⚙️` → Navigates to `/settings`
    - `Who Viewed Me 👀` → Navigates to `/viewers`
    - `Leaderboard 🏆` → Navigates to `/leaderboard`
    - `Upgrade to Premium 👑` → Navigates to `/premium`
    - `Sign Out 🚪` → Triggers native-safe logout flow
  - Profile Photos Gallery Grid
  - Personal Details List: Hobbies, Zodiac, Dating intent, Music taste, Drinking/Smoking habits
- **Buttons / Actions**: All grid tiles navigate to their respective screens; Edit Profile button opens form
- **State Handling**:
  - *Loading*: Profile skeleton loader
  - *Offline*: Displays cached profile data from SWR local storage cache
- **Web-Wrapper Behaviors Observed**: Scrollable web container; sign-out uses local storage key purging & Supabase auth clear timeout.

---

### Screen 13: Edit Profile (`/profile/edit`)
- **Screen Name**: Edit Profile & Photos
- **Entry Point**: Profile page "Edit Profile" button
- **Navigation Destination**: `/profile`
- **Visible Components**:
  - Photo Management Grid: 6 photo upload slots with drag-to-reorder, primary photo indicator, delete photo action (🗑️), add photo action (+)
  - Text Form Fields: Full Name, Bio (with character count limit 0/300), Department, Level select, Relationship goal select
  - Interests & Hobbies Multi-Select Chips
  - AI Bio Assistant Button ("Generate AI Bio ✨")
  - Save Changes sticky bottom button
- **Buttons / Actions**: `Upload Photo`, `Delete Photo`, `Generate AI Bio`, `Save Profile`
- **Form Fields**: Bio textarea, department input, level select, interest chips
- **State Handling**:
  - *Loading*: Image upload progress bar & RPC save spinner
  - *Error*: Validation toast ("Please upload at least 1 photo")
- **Web-Wrapper Behaviors Observed**: Browser image file input dialog (`<input type="file">`); canvas compression performed in browser JS.

---

### Screen 14: Premium Upgrade (`/premium`)
- **Screen Name**: Premium Access & Subscription Shop
- **Entry Point**: Dashboard upsell, Match limit modal, Profile hub grid "Upgrade to Premium"
- **Navigation Destination**: RevenueCat billing / Google Play purchase sheet, Paystack web fallback
- **Visible Components**:
  - Crown Icon & Gradient Banner ("Unlock The College Date Premium 👑")
  - Premium Benefits Comparison List: Unlimited Swipes 🔥, See Who Liked You 👀, 5 Free Super Swipes / Month ⭐, Rewind Last Pass ⏪, Campus Passport ✈️
  - Plan Selector Cards: Monthly Premium (`₦3,000 / month` or Google Play `$rc_monthly`), 3-Month Plan, 6-Month Plan
  - Purchase CTA Button: "Upgrade Now" (Triggers `@revenuecat/purchases-capacitor` on Android native or Paystack inline script on Web)
  - Direct Consumables Purchase Section: Buy 24h Boost (`₦1,000`), Buy 5 Super Swipes (`₦1,500`)
- **Buttons / Actions**:
  - `Select Plan Card` → Highlights plan
  - `Upgrade Now (CTA)` → Calls RevenueCat `Purchases.purchasePackage` on Android or Paystack web fallback
  - `Restore Purchases` → Calls RevenueCat `restorePurchases()`
- **State Handling**:
  - *Loading*: RevenueCat offerings fetch loading state
  - *Active Premium User State*: Displays "You are a Premium Member! 👑 Active until [Date]" with plan details
- **Web-Wrapper Behaviors Observed**: Web fallback opens Paystack JS iframe popup if RevenueCat plugin is unavailable.

---

### Screen 15: Wallet & Earnings (`/wallet`)
- **Screen Name**: Student Wallet & Token Ledger
- **Entry Point**: Profile grid "My Wallet", Top App Bar wallet badge
- **Navigation Destination**: `/premium`, Withdraw Modal
- **Visible Components**:
  - Balance Card: Current Balance (`₦X,XXX.XX`), Total Earned (`₦Y,YYY.YY`), Pending Rewards (`₦Z,ZZZ.ZZ`)
  - Quick Action Buttons: Fund Wallet (Paystack deposit), Withdraw Funds (Bank transfer payout), Buy Boosts
  - Transaction History Ledger List: Date, Type (Deposit, Swipe Payment, Referral Reward, Withdrawal), Amount, Status (Completed, Pending, Failed)
  - Withdrawal Request Modal: Bank selection dropdown, Account Number input, Account Name lookup resolution, Withdrawal Amount input
- **Buttons / Actions**: `Fund Wallet`, `Withdraw`, `View Transaction Details`
- **Form Fields**: Bank dropdown, Account number input, Withdrawal amount
- **State Handling**: Bank account verification RPC resolves account name automatically upon 10-digit entry
- **Web-Wrapper Behaviors Observed**: Paystack inline web payment modal integration.

---

### Screen 16: Referrals & Rewards (`/referrals`)
- **Screen Name**: Invite Friends & Earn
- **Entry Point**: Profile hub grid "Referrals"
- **Navigation Destination**: Native Share Intent, Wallet
- **Visible Components**:
  - Reward Header Card: "Earn ₦500 for every friend who joins and completes profile!"
  - Personal Referral Code & Link Box: Display code (e.g. `UNILAG-8821`), Copy Code button, Native Share Link button
  - Referral Stats Overview: Total Invited, Completed Profiles, Matured Earnings
  - Referred Friends List: Friend avatar, name, signup date, completion status badge (Pending / Matured)
- **Buttons / Actions**:
  - `Copy Code` → Copies referral code to clipboard with toast notification
  - `Share Invite Link` → Calls `navigator.share()` or Capacitor Share plugin
- **State Handling**: Dynamic referral count calculation via `get_referral_stats` RPC
- **Web-Wrapper Behaviors Observed**: Web Clipboard API (`navigator.clipboard.writeText`) with fallback.

---

### Screen 17: Leaderboard (`/leaderboard`)
- **Screen Name**: Campus Popularity & Engagement Leaderboard
- **Entry Point**: Dashboard card, Profile hub grid "Leaderboard"
- **Navigation Destination**: `/profile/:userId`
- **Visible Components**:
  - Period Filter Tabs: `This Week`, `This Month`, `All Time`
  - Category Filter Chips: `Top Liked ❤️`, `Most Active ⚡`, `Campus Gist 🙊`
  - Podium Top 3 View: Gold (#1), Silver (#2), Bronze (#3) crowned profile cards with avatar, name, school, score
  - Ranked List (Ranks 4-50): Rank number, avatar, name, university, engagement score, action button
- **Buttons / Actions**:
  - `Tab / Filter Tap` → Refreshes leaderboard rankings
  - `Rank Row Tap` → Opens user profile drawer
- **State Handling**: Fetches data from `leaderboard_unified` view with SWR local caching
- **Web-Wrapper Behaviors Observed**: Standard web scroll list.

---

### Screen 18: Campus Confessions (`/confessions`)
- **Screen Name**: Anonymous Campus Gist & Confessions
- **Entry Point**: Dashboard card, Bottom nav (if configured)
- **Navigation Destination**: Individual confession comment drawer
- **Visible Components**:
  - Top Bar: Category Filter Chips (`All`, `General`, `Crush 💌`, `Lecturers 👨‍🏫`, `Exams 📚`, `Cafeteria 🍔`)
  - "Post Anonymous Confession" floating action button (FAB / top composer bar)
  - Confession Post Cards: Anonymous background avatar/color, post text, timestamp, campus tag (e.g. "OAU Campus"), reaction breakdown bar (🔥, 😂, 🙊, 🙏, 😢), comment count badge
  - New Confession Modal: Textarea, campus tag select, optional media upload, post anonymously checkbox
- **Buttons / Actions**:
  - `Reaction Emoji Button` → Increments/decrements user reaction count via `confession_reactions` table
  - `Comment Button` → Opens comment sheet below post
  - `Create Confession` → Submits new confession row to `confessions` table
- **Form Fields**: Confession textarea, campus selector
- **State Handling**: Realtime reaction count updates; content moderation filter check
- **Web-Wrapper Behaviors Observed**: Absolute positioned FAB button; web modal overlay.

---

### Screen 19: Settings & Account Controls (`/settings`)
- **Screen Name**: Settings & Security
- **Entry Point**: Profile hub grid "Settings"
- **Navigation Destination**: `/change-password`, `/privacy-policy`, `/terms`, `/login` (on logout)
- **Visible Components**:
  - Account Settings Section: Edit Email, Change Password, Notification Preferences (Push, Email, In-app toggles)
  - App Preferences: Dark Mode (Default dark), Sound Effects toggle
  - Support & Partner Section: Help Center / FAQs, Become a Partner (WhatsApp link), Contact Support
  - Account Life-cycle Section: Sign Out button, Delete Account button (with red warning confirmation modal)
  - App Version & Build Metadata: "The College Date v2.2.36 (Build 33)"
- **Buttons / Actions**:
  - `Notification Toggles` → Updates `profiles.notification_settings` column
  - `Become a Partner / Support` → Opens WhatsApp link (`https://wa.me/...`)
  - `Sign Out` → Executes native-safe logout flow (clears Supabase session, purges local cache, redirects to `/login`)
  - `Delete Account` → Shows double-confirmation dialog before invoking delete RPC
- **State Handling**: Immediate state updates for toggle switches
- **Web-Wrapper Behaviors Observed**: Logout clears browser `localStorage` & `sessionStorage` keys.

---

### Screen 20: Viewers / Admirers (`/viewers` & `/requests`)
- **Screen Name**: Who Viewed Me & Secret Admirers
- **Entry Point**: Profile hub grid "Who Viewed Me", Dashboard Admirers banner
- **Navigation Destination**: `/profile/:userId`, `/premium`
- **Visible Components**:
  - Tab Bar: `Who Viewed Me 👀`, `Likes You ❤️`
  - Viewer / Admirer Cards List: Profile avatar (blurred with lock icon for free users, sharp photo for Premium users), name, university, time viewed/liked
  - Premium Upsell Banner for Free Users: "Upgrade to Premium to unblur 14 secret admirers who liked your profile!"
- **Buttons / Actions**:
  - `Unblur Button / Upsell Card` → Navigates to `/premium`
  - `Accept Admirer Button (for Premium users)` → Triggers `accept_swipe_request` RPC to form immediate match
- **State Handling**: Secured server RPC (`get_profile_viewers_secure` & `get_admirers_secure`) returns blurred metadata for free tier users.

---

## 3. Verification & Compliance Notes

- **Zero Real User Information Exposed**: All examples use generic placeholders (Amaka, Tunde, Zainab, UNILAG, OAU, OAU Campus).
- **All 20 screens inventoried** with entry points, destinations, visible components, interactive elements, form fields, keyboard/scroll behavior, and web-wrapper artifacts.
- **Stage 2 Screen Inventory Complete.**
