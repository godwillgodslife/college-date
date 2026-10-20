# The College Date — Payment & Entitlement Security Audit

**Generated Date**: October 20, 2026  
**Auditor**: Payment Security Auditor & Financial Systems Engineer  
**Scope**: In-App Billing (Google Play via RevenueCat), Paystack Web Checkout, Wallet Balances, Subscriptions, and Entitlements.

---

## 1. Executive Summary: Financial Architecture
The payment infrastructure separates payment collection (handled by PCI-DSS compliant third parties: Paystack for Nigerian Naira web transactions and Google Play Billing for Android mobile) from entitlement fulfillment (enforced authoritatively on the Supabase database backend).

---

## 2. Payment Gateway Verification Integrity

### 2.1 Paystack Webhook (`supabase/functions/paystack-webhook/index.ts`)
- **Signature Verification**: Validates `x-paystack-signature` using HMAC-SHA512 with `Deno.env.get('PAYSTACK_SECRET_KEY')` using `constantTimeEqual` to prevent timing attacks.
- **Idempotent Deduplication**: Inserts raw event hashes into `public.provider_webhook_events`. PostgreSQL unique constraint `23505` discards duplicate webhook deliveries gracefully.
- **Amount & Currency Validation**: Compares received amount (in kobo converted to NGN) and currency (NGN) against pre-existing `public.payment_attempts` before awarding entitlements.
- **Entitlement Fulfillment**: Invokes authoritative `SECURITY DEFINER` RPC `grant_paid_product_entitlements` using the `service_role` key.

### 2.2 RevenueCat Android Webhook (`supabase/functions/revenuecat-webhook/index.ts`)
- **Authentication**: Checks `Authorization` header against `Deno.env.get('REVENUECAT_WEBHOOK_AUTH')`.
- **Hardening Applied**: Replaced standard string comparison with `constantTimeEqual` to eliminate timing side-channel risks.
- **Entitlement Mapping**: Accurately maps `Ultra` entitlement to `plan_type = 'Elite Ultra'` and `profiles.is_ultra = true`, and `Premium` to `plan_type = 'Premium'`.
- **Revocation Handling**: Safely processes `EXPIRATION`, `REFUND`, `REVOKE`, and `TRANSFER` events by deactivating subscriptions and resetting profile tier flags.

---

## 3. Wallet & In-App Economy Integrity

### 3.1 Referral Milestone Infinite Money Remediation (CRITICAL)
- **Vulnerability**: `public.process_referral_milestones` permitted an authenticated user with 10 referrals to repeatedly claim 3,000 NGN bonuses indefinitely.
- **Fix Applied**:
  - Implemented `referral_milestones_awarded integer[]` column on `public.wallets`.
  - Enforced `FOR UPDATE` row lock on sender's wallet to eliminate race conditions.
  - Verified milestone tier has not been awarded previously before crediting balance.
  - Audited transaction in `public.wallet_transactions`.

### 3.2 Self-Gifting Restriction
- **Fix Applied**: `process_gift_purchase` now rejects requests where `p_sender_id = p_receiver_id`, preventing wallet balance manipulation.

### 3.3 Native Android Mock Bypass Guard
- In `src/services/paymentService.js`, mock activation is strictly guarded with `!isNative()`, ensuring Capacitor local origins (`https://localhost`) cannot trigger mock test activations on Android production builds.

---

## 4. Wallet Balance Direct Table Protection
- Client access to `public.wallets`, `public.wallet_transactions`, and `public.wallet_ledger` is strictly restricted to `SELECT` (read-only for own records: `user_id = auth.uid()`).
- All `INSERT`, `UPDATE`, `DELETE` operations from the client role (`authenticated`) are explicitly REVOKED by database migrations (`20260721120000_premium_payment_remediation_foundation.sql` and `20260725110000_premium_payment_remediation_grant_hardening.sql`).
