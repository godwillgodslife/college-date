# The College Date — Threat Model & STRIDE Analysis

**Generated Date**: October 20, 2026  
**Methodology**: STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)  
**Primary Focus**: High-risk financial, identity, communication, and administrative attack surfaces.

---

## 1. Threat Actors & Capabilities

| Threat Actor | Motivation | Capabilities | Target Surfaces |
| :--- | :--- | :--- | :--- |
| **Malicious Student User** | Financial gain, free premium, catfishing, stalking | Authenticated web/app client, script automation, DevTools manipulation | Chat, Wallets, Referrals, Profile trust badges, Discovery swipes |
| **External Attacker / Scraper** | Bulk student PII harvesting, phone numbers, WhatsApp handles | Automated headless browsers, proxies, credential stuffing, API fuzzing | Explore, Confessions, Public profiles, Bio text, Auth endpoints |
| **Malicious Insider / Rogue Admin** | Unauthorized user snooping, wallet manipulation, confiscation | Possesses limited admin credentials or unverified email matching admin address | `/admin` surface, Admin RPCs, User status toggles, Payout approvals |
| **Physical Device Attacker** | Account hijacking, private chat inspection | Physical possession of unlocked Android device, USB debugging (ADB) | Android WebView, Local storage, SQLite cache, Chrome DevTools inspect |
| **Payment Fraudster** | Subscription theft, wallet balance generation, chargeback fraud | Webhook replay, signature brute force, forged client claims | `paystack-webhook`, `revenuecat-webhook`, `grant_paid_product_entitlements` |

---

## 2. STRIDE Threat Matrix & Analysis

### 2.1 Spoofing Identity (S)
- **Threat S1: Admin Email Spoofing via Unconfirmed Signup**
  - *Scenario*: Attacker creates an account with an email matching `godwillgodslife@gmail.com` or `jackreecesokieprim@gmail.com` on an unconfirmed or testing state. If `is_app_admin()` or `admin_is_owner()` only checks email string without verifying `email_confirmed_at IS NOT NULL`, the unconfirmed user inherits administrative rights.
  - *Impact*: CRITICAL. Full platform takeover.
  - *Mitigation*: Hardened `is_app_admin()`, `admin_is_owner()`, and `admin_has_permission()` to strictly enforce `v_user.email_confirmed_at IS NOT NULL`.

- **Threat S2: Chat Sender Impersonation**
  - *Scenario*: Malicious client attempts to insert messages with an arbitrary `sender_id` into `public.messages`.
  - *Impact*: HIGH. Forged conversations and fraud.
  - *Mitigation*: All message creation is routed through `SECURITY DEFINER` RPC `send_native_text_message()` which binds `sender_id := auth.uid()`.

### 2.2 Tampering with Data (T)
- **Threat T1: Client-Side Badge & Verification Tampering**
  - *Scenario*: User modifies client state or calls direct table updates to set `is_verified = true`, `photo_verified = true`, `is_premium = true`.
  - *Impact*: HIGH. Verification bypass and premium theft.
  - *Mitigation*: PostgreSQL trigger `enforce_profile_trust_field_integrity()` detects and forcibly reverts any unauthorized change to trust fields.

- **Threat T2: Infinite Money Glitch via Referral Milestone Replay**
  - *Scenario*: User with 10 referrals calls `process_referral_milestones()` repeatedly in a loop. Since referral count remains 10 (which is divisible by 10) and both pending and rewarded are counted, the RPC adds 3,000 NGN on every invocation.
  - *Impact*: CRITICAL. Unlimited wallet balance inflation and financial drain.
  - *Mitigation*: Store rewarded milestone tiers in `wallets.referral_milestones_awarded integer[]` and enforce single-claim execution with `FOR UPDATE` row lock.

- **Threat T3: Storage Object Overwrite via `pending-avatars`**
  - *Scenario*: Authenticated user uploads an arbitrary file into another user's path in `pending-avatars` because the RLS policy only checked `bucket_id = 'pending-avatars'`.
  - *Impact*: MEDIUM. File tampering and potential denial of service during onboarding.
  - *Mitigation*: Enforce `(storage.foldername(name))[1] = auth.uid()::text` in storage RLS for INSERT and UPDATE.

### 2.3 Repudiation (R)
- **Threat R1: Financial Action Repudiation**
  - *Scenario*: User claims a gift purchase, withdrawal, or subscription was unauthorized or forged.
  - *Impact*: MEDIUM. Chargeback disputes and operational loss.
  - *Mitigation*: Every transaction writes immutable entries into `public.wallet_transactions` and `public.wallet_ledger` with UUID nonces, client timestamps, and provider references.

- **Threat R2: Moderation Action Denial**
  - *Scenario*: An administrator denies banning a user or approving a withdrawal.
  - *Impact*: LOW. Loss of accountability.
  - *Mitigation*: `admin_write_audit_log()` records acting admin UUID, email, action type, target ID, and JSON metadata.

### 2.4 Information Disclosure (I)
- **Threat I1: Live DOM & Token Extraction via Android WebView Debugging**
  - *Scenario*: Attacker connects an Android device to a computer via USB and opens `chrome://inspect` because `"webContentsDebuggingEnabled": true` is hardcoded in `capacitor.config.json`.
  - *Impact*: HIGH. Instant extraction of user JWT session tokens, encrypted local storage, and private chat history.
  - *Mitigation*: Set `"webContentsDebuggingEnabled": false` in release configuration.

- **Threat I2: Global Supabase Client Exposure (`window.__supabase`)**
  - *Scenario*: `window.__supabase = supabase` is exposed on the global window object in production. Any third-party script or browser extension can execute `window.__supabase.auth.getSession()` to dump credentials.
  - *Impact*: HIGH. Token harvesting and privilege elevation.
  - *Mitigation*: Wrap window attachment in `import.meta.env.DEV` check.

- **Threat I3: Off-Platform Contact & Bio Scraping**
  - *Scenario*: Users share phone numbers, WhatsApp links, or social handles to bypass platform retention or facilitate off-platform scamming.
  - *Impact*: MEDIUM. Loss of safety, platform circumvention, harassment.
  - *Mitigation*: Multi-surface `offPlatformGuard.js` engine and database trigger `check_message_off_platform_contact()` redacts and blocks contact sharing across Chat, Profiles, and Confessions for non-Ultra users.

### 2.5 Denial of Service (D)
- **Threat D1: Vision AI Rate Limit Exhaustion**
  - *Scenario*: Malicious user submits rapid file uploads to `validate-profile-photo` to exhaust OpenRouter AI credits or trigger quota locks.
  - *Impact*: MEDIUM. Disruption of student photo validation during onboarding.
  - *Mitigation*: Server-side model failover queue and heuristic validation fallback.

- **Threat D2: Realtime Message Flooding**
  - *Scenario*: Bot floods chat channel with rapid messages.
  - *Impact*: MEDIUM. Client browser freezing and battery drain.
  - *Mitigation*: Client nonce deduplication and UI message virtualization (`react-virtuoso`).

### 2.6 Elevation of Privilege (E)
- **Threat E1: Non-Admin Direct Access to `/admin` RPCs**
  - *Scenario*: Standard user executes `supabase.rpc('admin_get_wallets')` or `admin_set_user_status()`.
  - *Impact*: CRITICAL. Unauthorized access to platform finances, audit logs, and user controls.
  - *Mitigation*: Every single admin RPC enforces `admin_has_permission()` or `admin_is_owner()`, terminating unauthorized callers with PostgreSQL exceptions.

---

## 3. Residual Risk Assessment Summary

| Threat ID | Threat Description | Inherent Risk | Post-Remediation Residual Risk | Status |
| :--- | :--- | :---: | :---: | :---: |
| **T2** | Referral milestone infinite balance glitch | **CRITICAL** | **NEGLIGIBLE** | **REMEDIATED (SQL Migration)** |
| **I1** | Android release webContentsDebuggingEnabled | **HIGH** | **NEGLIGIBLE** | **REMEDIATED (Capacitor Config)** |
| **I2** | Global window.__supabase client exposure | **HIGH** | **NEGLIGIBLE** | **REMEDIATED (Source Code)** |
| **S1** | Unconfirmed admin email spoofing | **HIGH** | **NEGLIGIBLE** | **REMEDIATED (SQL Migration)** |
| **T3** | `pending-avatars` cross-user upload bypass | **MEDIUM** | **NEGLIGIBLE** | **REMEDIATED (Storage RLS)** |
| **E1** | Internal preview & lab routes exposed | **MEDIUM** | **NEGLIGIBLE** | **REMEDIATED (Route Guard)** |
| **P1** | Self-gifting balance cycling | **LOW** | **NEGLIGIBLE** | **REMEDIATED (SQL Migration)** |
| **W1** | RevenueCat webhook timing attack | **LOW** | **NEGLIGIBLE** | **REMEDIATED (Constant Time)** |
