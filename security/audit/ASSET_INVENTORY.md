# The College Date — Comprehensive Asset & Attack Surface Inventory

**Generated Date**: October 20, 2026  
**Auditor**: Application Security & DevSecOps Red Team  
**Scope**: Production Ecosystem (Web, Mobile, Cloud Functions, Database, External APIs)

---

## 1. Verified Core Architecture

| Component | Verified Technology Stack | Trust Boundary | Primary Repository Path / Configuration |
| :--- | :--- | :--- | :--- |
| **Web Frontend** | React 19.2, Vite 7.3, React Router 7.13, SWR 2.4 | Client Untrusted | `src/`, `vite.config.js`, `index.html` |
| **Android Container** | Capacitor 8.1, Android SDK 35 (Android 15), Java/Kotlin | Client Untrusted / OS Boundary | `android/`, `capacitor.config.json` |
| **Web Hosting & Edge** | Netlify Enterprise CDN, Custom Routing, Headers | Cloud Edge (Semi-Trusted) | `netlify.toml`, `public/_headers`, `public/_redirects` |
| **Database & Auth** | Supabase Managed PostgreSQL 15, GoTrue Auth, RLS | Authoritative Backend (Trusted) | `supabase/baseline/`, `supabase/migrations/` |
| **Edge Functions** | Deno TypeScript Serverless Runtime (Supabase Functions) | Authoritative Backend (Trusted) | `supabase/functions/` |
| **Push Notifications** | OneSignal Web/Native SDK, FCM (Android 13+), Apple APNs | External Third-Party Integration | `src/services/pushNotification.js`, `OneSignal` |
| **Realtime Voice/Video** | Agora RTC Engine (`agora-rtc-sdk-ng`, `agora-token`) | Peer-to-Peer / WebRTC Cloud | `src/services/agoraTokenService.js` |
| **Web Payment Gateway** | Paystack Inline / Redirect Checkout (NGN) | Third-Party Payment Processor | `supabase/functions/paystack-webhook/` |
| **In-App Billing** | Google Play Billing via RevenueCat Capacitor SDK | Third-Party In-App Billing Engine | `supabase/functions/revenuecat-webhook/` |
| **Face & Liveness AI** | OpenRouter Vision Multi-Model API (`gpt-4o-mini`, etc.) | External AI Vision Inference | `supabase/functions/validate-profile-photo/` |

---

## 2. Network & Public Entry Points

### 2.1 Web Routes & Canonical Domains
- Canonical Web Origin: `https://www.thecollegedate.com`
- Alternative Apex Origin: `https://thecollegedate.com` (redirects 301 to `www`)
- Authentication Callback Domain: `https://auth.thecollegedate.com` / `https://www.thecollegedate.com/auth/callback`
- Public Pages: `/`, `/about`, `/safety`, `/privacy`, `/terms`, `/child-safety`, `/child-safety-standards`, `/blog/*`, `/guides/*`, `/official/*`, `/tools/dating-bio-generator`
- Authenticated Application Routes: `/dashboard`, `/match`, `/explore`, `/chat`, `/messages/*`, `/status`, `/snap`, `/profile/*`, `/profile/edit`, `/settings`, `/referrals`, `/wallet`, `/requests`, `/leaderboard`, `/confessions`, `/premium`, `/viewers`, `/notifications`, `/mini-profile-setup`
- Administrative Surface: `/admin` (RBAC protected via `is_app_admin()` and `admin_has_permission()`)
- Internal Preview & Lab Routes (Exposed in Client Router): `/wireframes`, `/notification-preview`, `/notification-preview-lab`, `/push-preview`, `/push-lab`, `/android-ux-comparison`, `/ux-lab`, `/ux-approval`, `/android-ux-review`, `/ux-review`, `/android-design-review`, `/design-review`

### 2.2 Android App Components & Deep Links
- Application ID: `com.collegedate.app`
- Target SDK: 35 (Android 15) | Min SDK: 24 (Android 7.0)
- Current Release: Version 2.2.70 (Version Code 67)
- Exported Activity: `com.collegedate.app.MainActivity` (`exported="true"`, `launchMode="singleTask"`)
- Custom URL Scheme Intent Filter: `com.collegedate.app://auth/callback`
- Android App Links (`autoVerify="true"`): `https://www.thecollegedate.com` with paths `/auth/callback`, `/reset-password`, `/payment/callback`, `/dashboard`, `/match`, `/explore`, `/chat`, `/messages`, `/status`, `/snap`, `/profile`, `/settings`, `/referrals`, `/wallet`, `/requests`, `/leaderboard`, `/confessions`, `/premium`, `/viewers`, `/notifications`, `/call`, `/admin`, `/official`, `/ask`

---

## 3. Database Assets & Data Models

### 3.1 Sensitive User & Communication Tables
- `public.profiles`: Core student identity, age, university, photo arrays, verification state (`is_verified`, `photo_verified`), moderation state (`is_banned`, `is_shadow_banned`), tier (`is_premium`, `is_ultra`).
- `public.matches`: Mutually approved pairings (`user1_id`, `user2_id`, `status`).
- `public.messages`: Private chat communications, media links, ephemeral self-destruct timestamps (`expires_at`), read receipts, reaction metadata.
- `public.swipes`: Historical discovery interactions (`swiper_id`, `swiped_id`, `direction`).
- `public.confessions`: Anonymous and campus confessions, interaction counters, moderation states.
- `public.confession_reports`: Content moderation reports filed by campus users.
- `public.user_reports`: User harassment, scam, and child safety reports.

### 3.2 Financial & Entitlement Assets
- `public.wallets`: User balances (`available_balance`, `pending_balance`, `total_earned`, `total_spent`, `total_withdrawn`).
- `public.wallet_transactions`: Audit log of ledger events (gifts, referrals, withdrawals, boosts).
- `public.wallet_ledger`: Immutable financial ledger with unique source constraint deduplication.
- `public.subscriptions`: Active subscription records (`plan_type`, `status`, `expires_at`, `auto_renew`).
- `public.paid_products`: Authoritative product catalog with prices in NGN and entitlement durations.
- `public.payment_attempts`: Pre-checkout transaction session tracking.
- `public.provider_webhook_events`: Idempotent deduplication log for incoming third-party webhooks.

### 3.3 Storage Buckets
- `chat-media`: Private (`public = false`). Direct match participant access enforced via `private.can_access_match_media()`.
- `profile-photos`: Public read. Upload restricted to profile photo owner.
- `avatars`: Public read. Upload restricted to user folder.
- `pending-avatars`: Public read. Staging bucket for Vision AI validation prior to permanent profile promotion.
- `confession-images`: Public read. Upload restricted to authenticated users.
- `official-media`: Public read. Upload restricted to application administrators.

---

## 4. Unknowns & Out-of-Scope Assets

1. **Supabase Hosted Infrastructure**: Managed by Supabase (AWS eu-west-1 / RDS PostgreSQL). Underlying physical host, hypervisor, and OS security are verified via SOC 2 Type II compliance of Supabase.
2. **OneSignal Push Delivery Pipes**: Push delivery relies on OneSignal cloud servers and Google FCM; payloads contain notification titles and preview text.
3. **Paystack Gateway Processing**: Payment card collection is handled in Paystack's PCI-DSS Level 1 compliant iframe/hosted checkout. College Date never ingests or stores raw PAN, CVV, or card PIN.
4. **Google Play / Apple App Store Ingestion**: App signing keys for Play Store deployment are managed by Google Play App Signing with local upload key `college-date-release.jks`.
