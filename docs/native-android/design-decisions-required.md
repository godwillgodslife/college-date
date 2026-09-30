# Design & Product Decisions Required

Date: 2026-08-01  
Scope: Concise list of high-priority architectural and product decisions requiring Product Owner confirmation prior to native Compose implementation.

---

## 1. Decision List Summary

To ensure seamless alignment between product intent and native Android execution, the following 5 high-priority decisions are documented with clear trade-offs and recommended choices.

---

## 2. Decision Items

### Decision 1: Onboarding Step Scope & University List Enforcement
- **Screen / Feature**: `SCR-06` (Onboarding Setup Wizard)
- **Existing Wireframe Behavior**: Generic multi-step wizard asking for school and bio.
- **Current Live-App Behavior**: Strict 5-step wizard (`MiniProfileSetup.jsx`) requiring 18+ confirmation, selection from a curated list of Nigerian higher institutions (UNILAG, OAU, UI, FUTA, LASU, COVENANT, etc.), department, level, dating intent, and 1+ profile photo.
- **Available Options**:
  - *Option A (Recommended)*: Preserve strict live app onboarding rules with native Compose `HorizontalPager` and curated Nigerian university dropdown list.
  - *Option B*: Allow free-text university input without curated selection.
- **Recommended Choice**: **Option A**. Prevents data fragmentation and enables accurate campus-based filtering on Explore and Discovery.
- **User Impact**: Higher profile quality and accurate campus match grouping.
- **Development Impact**: Low — Nigerian university catalog already exists in web app and can be ported directly into Kotlin data objects.
- **Blocker Status**: Non-blocking (Recommended path can proceed immediately).

---

### Decision 2: Paystack Web Fallback vs Native Android Paystack Integration
- **Screen / Feature**: `SCR-14` (Wallet & Earnings)
- **Existing Wireframe Behavior**: Wireframe did not specify payment deposit mechanism.
- **Current Live-App Behavior**: Native RevenueCat handles Google Play subscriptions (`premium_monthly`). Wallet deposits use Paystack web inline popup script loaded inside WebView.
- **Available Options**:
  - *Option A (Recommended)*: Use a secure, temporary, custom Chrome Custom Tab / Web View Bottom Sheet for Paystack web checkout while keeping RevenueCat Google Play billing native.
  - *Option B*: Integrate Paystack Android SDK directly into Kotlin.
- **Recommended Choice**: **Option A**. Keeps wallet deposit functional without introducing extra native SDK maintenance while keeping Google Play billing native through RevenueCat.
- **User Impact**: Smooth payment checkout experience for Nigerian debit cards & bank transfers.
- **Development Impact**: Reduces native Android payment complexity and security review cycle.
- **Blocker Status**: Non-blocking.

---

### Decision 3: Campus Confessions Anonymity & Verification Badges
- **Screen / Feature**: `SCR-16` (Campus Confessions)
- **Existing Wireframe Behavior**: Generic anonymous post card.
- **Current Live-App Behavior**: Confessions posted anonymously with campus location tags ("OAU Campus"). Reaction breakdown strip tracks emoji responses per post.
- **Available Options**:
  - *Option A (Recommended)*: Fully anonymous posts with optional campus tag, displaying multi-emoji reaction counts.
  - *Option B*: Allow users to toggle between Anonymous posting and Verified Student posting.
- **Recommended Choice**: **Option A**. Protects student privacy on sensitive campus topics while preserving engagement through emoji reactions.
- **User Impact**: Encourages authentic campus gist without fear of exposure.
- **Development Impact**: Low — reuses existing `confessions` and `confession_reactions` table structure.
- **Blocker Status**: Non-blocking.

---

### Decision 4: Daily Free Swipe Quota & Premium Bypass Rules
- **Screen / Feature**: `SCR-07` (Match / Swipe)
- **Existing Wireframe Behavior**: Wireframe showed simple swipe counter without explicit wallet payment prompt.
- **Current Live-App Behavior**: Free users receive 20 swipes/day. Additional swipes invoke `process_swipe_payment` RPC or require Premium upgrade (`is_premium = true`). Premium users receive unlimited swipes.
- **Available Options**:
  - *Option A (Recommended)*: Preserve exact live app daily quota (20 swipes/day for free users, unlimited for Premium users).
  - *Option B*: Increase free daily quota to 50 swipes/day.
- **Recommended Choice**: **Option A**. Protects RevenueCat Premium conversion rate while preserving database RPC enforcement (`check_and_reset_swipe_limit`).
- **User Impact**: Clear incentive for upgrading to Premium.
- **Development Impact**: Zero — reuses existing database RPCs.
- **Blocker Status**: Non-blocking.

---

### Decision 5: Real-Time Voice/Video Call Architecture
- **Screen / Feature**: `SCR-10` (Chat Room Call Actions)
- **Existing Wireframe Behavior**: Wireframe showed voice call icon button.
- **Current Live-App Behavior**: Web app launches full-screen `/call/:matchId` WebRTC room (`VoiceCallRoom.jsx`).
- **Available Options**:
  - *Option A (Recommended)*: Defer native WebRTC call implementation to Phase 8, launching a secure WebRTC WebView Intent for calls in initial native releases.
  - *Option B*: Implement full native Agora / WebRTC Android SDK immediately in Phase 5.
- **Recommended Choice**: **Option A**. Ensures Chat, Swiping, and Messaging reach 100% native stability before tackling real-time audio/video WebRTC engine integration.
- **User Impact**: Voice/video calls remain functional during native rollout.
- **Development Impact**: Saves significant initial engineering effort.
- **Blocker Status**: Non-blocking.

---

## 3. Verification & Compliance Notes

- **5 high-priority decisions documented** with clear recommendations and zero implementation blockers.
- **Stage 10 Product-Owner Decisions Complete.**
