# Native Migration Map

Date: 2026-08-01

## Feature Classification

| Feature | Classification | Notes |
|---|---|---|
| Email/password login | Reuse backend unchanged | Implemented natively with Supabase Kotlin. |
| Registration | Reuse backend unchanged | Implemented for account creation; full profile onboarding is placeholder. |
| Password recovery | Reuse backend unchanged | Implemented reset request using native callback URL. |
| Session persistence | Native frontend rewrite only | Supabase Kotlin persistent session storage is used; no raw password storage. |
| Email verification | Reuse backend unchanged | Native route exists; exact production email-confirm setting needs approved env test. |
| Adult-age eligibility | Native frontend rewrite only | Deferred to onboarding phase; must mirror web age gate. |
| Campus/university selection | Native frontend rewrite only | Deferred to onboarding phase. |
| Profile creation/editing/photos | Reuse backend with minor changes | Requires native photo upload UX and storage policy verification. |
| Discovery/swiping | Reuse backend with minor changes | Existing discovery view/RPCs should be reused after RLS verification. |
| Likes/passes/matches | Reuse backend unchanged | Native UI rewrite later; matching RPCs already exist. |
| Realtime messaging | Reuse backend with minor changes | Requires native realtime lifecycle and offline cache. |
| Notifications | Reuse backend with minor changes | Native FCM/OneSignal registration deferred. |
| Premium entitlement display | Reuse backend unchanged | Read `profiles`/`subscriptions`; purchase not in phase 1. |
| Premium purchase | Deferred to a later phase | Must use Google Play Billing/RevenueCat; no payment changes here. |
| Wallet | Requires further investigation | Economy RPCs exist; native cash/payment UX needs security review. |
| Referrals | Reuse backend unchanged | Existing validation/apply RPCs can be reused later. |
| Leaderboard | Reuse backend with minor changes | Requires cache and RLS/view safety review. |
| Confessions/status/snap | Deferred to a later phase | Out of auth foundation scope. |
| Admin | Deferred to a later phase | Admin RPCs must not be exposed broadly in native client. |
| Account deletion | Requires new secure server endpoint | Local cache clearing can be native; destructive account deletion should be server mediated and confirmed. |
| Offline foundation | Native frontend rewrite only | Room/DataStore/WorkManager foundation implemented. |

## Screen Migration Table

| Existing route | Native destination | Primary action | Backend data | Local cache | Realtime | Notification | Loading | Empty | Error | Offline | Auth | Premium |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | `Welcome` or `Main` | Route by session | Supabase session, `profiles.is_onboarded` | Session/profile | No | No | Splash | Public welcome | Config/auth errors | Public fallback | Mixed | No |
| `/login` | `Login` | Sign in | Supabase Auth | Session | Auth status | No | Button spinner | N/A | Invalid/network banners | Network error | Public | No |
| `/signup` | `Register` | Create account | Supabase Auth metadata | Session | Auth status | Verification email if enabled | Button spinner | N/A | Validation/backend banners | Network error | Public | No |
| `/forgot-password` | `PasswordRecovery` | Send reset email | Supabase Auth | No | No | Email | Button spinner | Sent state | Validation/backend banners | Network error | Public | No |
| `/reset-password` | Future reset callback | Update password | Supabase Auth | Session | Auth status | No | Deferred | Deferred | Deferred | Deferred | Public/callback | No |
| `/auth/callback` | Deep link handler | Complete PKCE callback | Supabase Auth | Session | Auth status | No | Splash | N/A | Auth callback error | Network error | Public/callback | No |
| `/mini-profile-setup` | `Onboarding` | Complete profile | `profiles`, profile photo storage | Current profile | Presence later | No | Placeholder | Placeholder | Placeholder | Placeholder | Required | No |
| `/dashboard` | Main home placeholder | View summary | `profiles`, `wallets`, `subscriptions` | Profile/wallet summary | Dashboard updates | Yes later | Placeholder | Placeholder | Placeholder | Placeholder | Required | Mixed |
| `/match` | `Discovery` | Swipe | `discovery_feed_v3`, `swipes`, swipe RPCs | Discovery cards, pending writes | Discovery realtime | Match notifications | Placeholder | Placeholder | Placeholder | Placeholder | Required | Premium affects limits |
| `/explore` | `Discovery` | Browse/filter | `profiles`, discovery view | Discovery cards | Discovery realtime | No | Placeholder | Placeholder | Placeholder | Placeholder | Required | Some filters |
| `/chat`, `/messages`, `/messages/:chatId` | `Messages` | Read/send messages | `matches`, `messages`, chat media | Conversation list/recent messages | Match channels | Push/in-app | Placeholder | Placeholder | Placeholder | Placeholder | Required | Some features |
| `/requests` | `Matches` | Accept admirer | `get_admirers_secure`, `accept_swipe_request` | Request summaries | Incoming swipes | Match notifications | Placeholder | Placeholder | Placeholder | Placeholder | Required | May gate visibility |
| `/viewers` | `Profile` or `Premium` | View profile viewers | `get_profile_viewers_secure` | Viewer summary | No | No | Placeholder | Upsell | Placeholder | Cached summary | Required | Required for full list |
| `/profile/:userId?` | `Profile` | View profile | `profiles`, media buckets | Current/visited profile | Presence later | No | Placeholder | Placeholder | Placeholder | Cached profile | Required | No |
| `/profile/edit` | `Profile` | Edit profile | `profiles`, storage | Current profile, pending writes | No | No | Placeholder | Placeholder | Placeholder | Queue edits later | Required | No |
| `/settings` | `Settings` | Logout/account settings | Supabase Auth, preferences | Preferences | No | Notification prefs later | Implemented logout | N/A | Logout local fallback | Works locally | Required | No |
| `/referrals` | `Referrals` | Share/apply referral | referral RPCs/tables | Referral summary | No | Reward notifications later | Placeholder | Placeholder | Placeholder | Cached summary | Required | No |
| `/wallet` | `Wallet` | View/fund/withdraw | wallet RPCs/functions | Wallet summary/ledger | Wallet updates | Payment notifications | Placeholder | Placeholder | Placeholder | Cached read-only | Required | No |
| `/leaderboard` | `Leaderboard` | View rankings | leaderboard views | Leaderboard rows | No | No | Placeholder | Placeholder | Placeholder | Cached rows | Required | No |
| `/premium` | `Premium` | View/upgrade | `profiles`, `subscriptions`, RevenueCat later | Entitlement summary | No | Purchase updates later | Placeholder | Placeholder | Placeholder | Cached entitlement | Required | N/A |
| `/notifications` | Future notifications | Manage alerts | `notifications`, device RPCs | Recent notifications | Notification channel | Push | Deferred | Deferred | Deferred | Deferred | Required | No |
| `/confessions` | Deferred | Feed/post | confession tables/views | Feed cache | Optional | Moderation notifications | Deferred | Deferred | Deferred | Deferred | Required | Mixed |
| `/status`, `/snap` | Deferred | View/post ephemeral media | status/snapshot tables and buckets | Recent feed | Optional | Optional | Deferred | Deferred | Deferred | Deferred | Required | Mixed |
| `/call/:roomID` | Deferred | Voice/video call | `agora-call-token`, matches/messages | No sensitive media cache | Call signaling | Call push | Deferred | Deferred | Deferred | Deferred | Required | Freemium minutes |
| `/payment/callback` | Not native primary | Web payment callback | Paystack functions | No | No | Payment outcome | Deferred | N/A | Deferred | Deferred | Required | Payment |
| `/admin` | Deferred | Admin operations | Admin RPCs/functions | No | Optional | Admin push | Deferred | Deferred | Deferred | Deferred | Admin | No |

## Migration Order Recommendation

1. Verify native auth with approved test Supabase environment and anon key.
2. Build complete onboarding/profile edit and photo upload.
3. Add read-only profile/discovery cache and RLS verification.
4. Migrate discovery swipe actions with pending-write safeguards.
5. Migrate messaging and realtime lifecycle.
6. Migrate notifications.
7. Migrate premium entitlement display.
8. Migrate RevenueCat purchase flow and wallet only after separate payment security review.
