# Original Wireframe Inventory: The College Date

Date: 2026-08-01  
Source File: `src/pages/WireframeShowcase.jsx` & `src/pages/WireframeShowcase.css`  
Scope: Detailed inventory of the original Antigravity UI/UX Wireframe Showcase and interactive reference screens.

---

## 1. Executive Summary

The Antigravity Wireframe Showcase (`/wireframes`) was created to define visual layout targets, ergonomics, thumb-zone boundaries, and cognitive load reductions for **The College Date**. 

It specifies 8 core interactive views:
1. **💘 Match / Swipe**
2. **📥 Recent Chats**
3. **💬 Chat / DM**
4. **🎭 Profile & AI Coach**
5. **🚀 Onboarding & Setup**
6. **🔍 Explore**
7. **🙊 Confessions**
8. **🏆 Leaderboard**

This inventory evaluates each screen against native Android Jetpack Compose standards, identifying represented states, missing states, represented features, missing features, and suitability for native Android.

---

## 2. Screen-by-Screen Wireframe Inventory

### Screen 1: 💘 Match / Swipe View
- **Intended Purpose**: Primary dating discovery interface for viewing student cards and performing swipe decisions.
- **Main Layout**: Fullscreen card deck layout with top status bar, top compact filter bar, central stacked profile photo card, overlay gradient, expandable bio drawer, and bottom persistent action row.
- **Navigation**: Top filter icon (⚙️); bottom action buttons (✕ Pass, ⭐ Super Swipe, ❤️ Like); card drag gestures.
- **Key Components**:
  - Top bar with compact swipe counter (`14 / 20 Swipes`)
  - Stacked profile image card with rounded corners (`border-radius: 24px`)
  - Floating status pills (`🔴 LIVE`, `UNILAG 🎓`, `Distance 2.4 km`)
  - AI Compatibility pill (`89% Match ✨`)
  - Bottom Thumb-Zone Action Row (large circular touch targets: 60dp for Like/Pass, 50dp for Super Swipe)
- **Visual Hierarchy & Styling**:
  - Dark mode glassmorphism (`backdrop-filter: blur(12px)`)
  - Primary accent: Electric Violet (`#6C63FF`), Neon Pink (`#FF4B72`), Gold (`#FFD700`)
  - Typography: Bold title fonts (Inter/Outfit 24sp), clean body text (14sp)
- **Actions Included**: Left swipe (Pass), Right swipe (Like), Up swipe (Super Swipe), Tap card (Expand detail drawer).
- **States Represented**: Standard card view, Expanded card detail view, Mutual match overlay view.
- **States Missing in Wireframe**: Daily swipe limit reached state, Empty discovery state, Network loading skeleton, Offline pending queue indicator.
- **Outdatedness & Native Suitability**:
  - *Outdatedness*: Low. The layout is highly relevant and represents approved thumb-zone positioning.
  - *Native Suitability*: High. Fits Jetpack Compose `Modifier.pointerInput` swipeable gestures and Material 3 FloatingActionButton controls.

---

### Screen 2: 📥 Recent Chats / Inbox View
- **Intended Purpose**: Central messaging hub listing active conversations and recent unmessaged mutual matches.
- **Main Layout**: Vertical scrollable list with top header search bar, horizontal scrolling matches carousel, and vertical conversation list.
- **Navigation**: Search input, horizontal match avatar taps, vertical conversation row taps, bottom nav bar.
- **Key Components**:
  - Top Search Input bar ("Search matches or messages...")
  - New Matches Rail: Horizontal circular avatars (64dp diameter) with vibrant gradient borders & online status dots
  - Conversation Rows: 72dp height list items containing 56dp avatar, partner name, last message snippet, timestamp, and unread badge pill
- **Visual Hierarchy**: Clear separation between unmessaged matches (horizontal rail) and active threads (vertical list).
- **Actions Included**: Filter by search query, tap match to start conversation, tap conversation row to open chat thread.
- **States Represented**: Standard inbox list with mock conversations.
- **States Missing in Wireframe**: Zero matches empty state, Zero messages empty state, Searching filtering state, Failed message delivery indicator.
- **Outdatedness & Native Suitability**:
  - *Native Suitability*: High. Translates directly to Compose `LazyColumn` for conversation list and `LazyRow` for new matches.

---

### Screen 3: 💬 Chat / DM View
- **Intended Purpose**: 1-on-1 direct messaging environment with rich media, smart replies, and voice/video call entry points.
- **Main Layout**: Vertical message thread with top app bar, message history container, sticky quoted reply banner, horizontal AI Smart Reply strip, full-width composer row, and slide-up emoji keyboard.
- **Navigation**: App bar back button, call action icons (📞, 📹), composer controls, emoji drawer toggle.
- **Key Components**:
  - Top Chat App Bar: Partner photo, name, online status ("Active now"), Voice/Video call buttons
  - Chat Bubble Stream: Sent messages (right aligned, accent purple), Received messages (left aligned, glass dark container), timestamp & read checks
  - Quoted Reply Bubble: Attached preview banner above input
  - Smart Reply Strip: Horizontally scrollable AI suggestion chips ("Hey! 👋", "Which campus are you on?", "Free for coffee? ☕")
  - WhatsApp-style Composer Row: Full-width text input, Emoji drawer button, Camera/attachment button, Send/Voice record action
  - Categorized Emoji & Sticker Keyboard: Tabbed navigation (`🇳🇬 Stickers`, `😀 Emojis`), category selectors (`😊 People`, `❤️ Love`, `🔥 Fun`, `🍕 Food`, `📚 Campus`), search bar, Nigerian campus stickers ("Oversabi 🧐", "No Wahala 😌", "Chop Life 🍗")
- **Actions Included**: Type message, select smart reply, toggle emoji drawer, double-tap message to quote, tap call icon.
- **States Represented**: Active chat thread, Smart reply selection state, Expanded emoji drawer state.
- **States Missing in Wireframe**: Message sending state, Message failed state, Voice note recording state, Call active state.
- **Outdatedness & Native Suitability**:
  - *Native Suitability*: High. Excellent blueprint for Compose `Scaffold` + `LazyColumn` + `TextField` + `ModalBottomSheet` or Compose Keyboard inset handling.

---

### Screen 4: 🎭 Profile & AI Coach View
- **Intended Purpose**: Own profile summary, AI improvement recommendations, and visual account management hub.
- **Main Layout**: Vertical scrollable page with cover photo header, profile summary, inline AI Coach card, visual account grid (2x4 tiles), photo gallery, and detailed personal info cards.
- **Navigation**: Edit profile button, account grid tile actions, back navigation.
- **Key Components**:
  - Profile Photo Header: Full-bleed cover photo, verification badges (Verified Student 🎓, AI Verified 💙)
  - Name, Age, University, Department, Level
  - AI Profile Coach Card: Gradient card providing completeness score ("Profile Strength: 85%") and actionable improvement tips ("Add a voice intro to get +40% more matches!")
  - Visual Account Hub Grid (2x4 tiles):
    - `Edit Profile ✏️`
    - `My Wallet 👛`
    - `Referrals 🎁`
    - `Settings ⚙️`
    - `Who Viewed Me 👀`
    - `Leaderboard 🏆`
    - `Upgrade to Premium 👑`
    - `Sign Out 🚪`
  - Photos Grid (2x3 aspect-ratio tiles)
- **Actions Included**: Tap account grid tiles, tap Edit Profile, view AI suggestions.
- **States Represented**: Standard completed profile view.
- **States Missing in Wireframe**: Incomplete profile warning state, Visited user profile view (without edit/account grid).
- **Outdatedness & Native Suitability**:
  - *Native Suitability*: High. The 2x4 visual account grid eliminates confusing nested dropdown menus and maps cleanly to Compose `LazyVerticalGrid`.

---

### Screen 5: 🚀 Onboarding & Setup View
- **Intended Purpose**: Step-by-step profile creation wizard for new users.
- **Main Layout**: Focused step card with top progress dots, step title, single input field per screen, auto-focus, and single primary action CTA.
- **Navigation**: Previous step arrow, Next step / Complete button.
- **Key Components**:
  - Progress Bar / Dot Indicators (`Step 1 of 5`)
  - Step Header Copy ("Select your University")
  - Single Focused Field: Large dropdown / text input with subtle glowing border
  - Single Primary Button ("Continue →")
- **Actions Included**: Select option, advance step, go back step.
- **States Represented**: Step-by-step form progression.
- **States Missing in Wireframe**: Validation error state, Uploading photo progress state, Completion celebration animation.
- **Outdatedness & Native Suitability**:
  - *Native Suitability*: High. Fits Jetpack Compose `HorizontalPager` or step-based `AnimatedContent` wizard.

---

### Screen 6: 🔍 Explore View
- **Intended Purpose**: Campus search, category filtering, and profile browsing grid.
- **Main Layout**: Top sticky search bar, horizontal category filter chips, two-column masonry card grid, and quick-action overlay tray.
- **Navigation**: Search input, category chips, card tap (opens detail drawer), quick-action buttons.
- **Key Components**:
  - Search bar input with clear button
  - Category Filter Chips (`All`, `🔴 Live`, `✨ Newest`, `Near Me`, `Serious 💍`, `Casual 🔥`)
  - Masonry Profile Grid: Asymmetric profile cards showing photo, name, school, status pill (`🔴 LIVE`), and hover quick tray (❤️ Like, 💬 Chat)
- **Actions Included**: Search by text, select category filter, tap quick like, tap quick chat.
- **States Represented**: Standard explore grid.
- **States Missing in Wireframe**: Search zero results state, Filter bottom sheet modal, Network loading grid.
- **Outdatedness & Native Suitability**:
  - *Native Suitability*: High. Maps to Compose `LazyVerticalStaggeredGrid` with top sticky headers.

---

### Screen 7: 🙊 Confessions View
- **Intended Purpose**: Anonymous campus gist, secret confessions, and emoji reactions.
- **Main Layout**: Top sticky category chips, "Post Confession" trigger bar, vertical confession cards list, and inline reaction breakdown bar.
- **Navigation**: Category chips, reaction emoji taps, post confession CTA, comment drawer trigger.
- **Key Components**:
  - Category Chips (`General`, `Crush 💌`, `Lecturers 👨‍🏫`, `Exams 📚`, `Cafeteria 🍔`)
  - Confession Post Card: Anonymous avatar badge, confession text, campus location tag ("OAU Campus"), timestamp, interactive emoji reaction breakdown strip (🔥 42, 😂 18, 🙊 12, 🙏 7, 😢 3), comment count badge
  - Floating Action Button (+) for new post
- **Actions Included**: React with emoji, view comment thread, post new confession.
- **States Represented**: Standard confession feed.
- **States Missing in Wireframe**: Post confession modal, Comment sheet, Flag/report post modal.
- **Outdatedness & Native Suitability**:
  - *Native Suitability*: High. Standard Compose `LazyColumn` feed with `Row` reaction chips.

---

### Screen 8: 🏆 Leaderboard View
- **Intended Purpose**: Campus engagement rankings, hall of fame, and top student profiles.
- **Main Layout**: Top period tabs, category chips, Top 3 podium display, and vertical ranked list (ranks 4-50).
- **Navigation**: Period tabs (`This Week`, `This Month`, `All Time`), row taps.
- **Key Components**:
  - Period Segmented Control Tabs
  - Podium Top 3 Display: Gold (#1), Silver (#2), Bronze (#3) crowned cards with profile avatar, name, campus, and score
  - Ranked List Rows: Rank badge, profile photo, name, university, score, quick action
- **Actions Included**: Switch period tab, tap rank row to view profile.
- **States Represented**: Standard leaderboard view.
- **States Missing in Wireframe**: Empty leaderboard state, User unranked state.
- **Outdatedness & Native Suitability**:
  - *Native Suitability*: High. Compose `LazyColumn` with custom podium header.

---

## 3. Verification & Compliance Notes

- **Zero Real User Info Used**: All screen inventories use generic wireframe placeholders.
- **All 8 original wireframe screens inventoried** in full detail.
- **Stage 3 Inventory Complete.**
