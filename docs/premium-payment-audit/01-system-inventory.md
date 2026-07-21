# System Inventory

## Primary Source Files

| Path | Purpose | Platform | Used | Notes |
|---|---|---:|---:|---|
| `src/pages/PremiumUpgrade.jsx` | Premium screen, Paystack web checkout, RevenueCat native checkout, wallet Premium, boost purchases | Web/Android | Yes | Main monetization UI. Hardcodes NGN 2,900, NGN 1,000 boost, NGN 500 super swipe. |
| `src/services/paymentService.js` | Wallet reads, transaction creation/completion, Paystack inline loader, wallet payments, boosts, RevenueCat SDK wrappers | Web/Android | Yes | Contains provider branching and RevenueCat key guard. |
| `src/utils/premium.js` | Shared premium active helper | Web/Android | Yes | Treats missing/invalid expiry as active if premium flag or active plan exists. |
| `src/contexts/AuthContext.jsx` | Hydrates profile, wallet, subscription into app auth state | Web/Android | Yes | Combines `profiles` and `subscriptions` for local premium. |
| `src/pages/Match.jsx` | Swipe limit UI, standard/premium swipe flow, Super Swipe flow | Web/Android | Yes | Premium bypasses standard swipe limit and wallet charge. |
| `src/services/swipeService.js` | Discovery, swipe recording, swipe payment RPC, Super Swipe RPC | Web/Android | Yes | Upserts `swipes` before payment RPC. |
| `src/pages/Viewers.jsx` | Who-viewed-me premium UI | Web/Android | Yes | Fetches viewer identities then blurs for free users. Backend gate unverified. |
| `src/pages/Requests.jsx` | Incoming likes/request reveal | Web/Android | Yes | Fetches requester profile and blurs non-priority for free users. Backend gate unverified. |
| `src/components/ProfileDrawer.jsx` | Explore profile drawer and paid/free vibe action | Web/Android | Yes | Premium bypasses wallet balance check. |
| `src/pages/Wallet.jsx` | Wallet funding, payout request, transaction history | Web/Android | Yes | Uses Paystack funding even in native shell; withdrawal uses direct client wallet update. |
| `src/components/GiftStore.jsx` | Gift price UI | Web/Android | Yes | Local static gifts duplicate server gift table. |
| `src/services/giftService.js` | Gift purchase RPC wrapper | Web/Android | Yes | RPC enforces auth in migration. |
| `src/pages/Settings.jsx` | Premium status and restore purchase | Web/Android | Yes | Restore calls Paystack restore only, not RevenueCat restore. |
| `src/pages/AdminDashboard.jsx` | Finance ledger, wallets, app config, premium filter | Admin web | Yes | Read/reporting focused. No direct manual premium grant UI found. |
| `native-android-prototype/.../BillingRepository.kt` | Native prototype RevenueCat flow | Android prototype | Partial | Not the production Capacitor app, but documents expected RevenueCat identifiers. |
| `native-android-prototype/.../BillingReadiness.kt` | Expected RC offering/product/entitlement constants | Android prototype | Partial | `android_premium`, `premium_monthly:monthly-base`, `Premium`. |

## Backend Functions

| Path | Purpose | Auth | Used | Notes |
|---|---|---|---:|---|
| `supabase/functions/verify-paystack-transaction/index.ts` | Server verifies Paystack reference and grants wallet/Premium | JWT required by function config, plus internal `getUser` | Yes | Verifies amount against client-created transaction row, not trusted catalog. |
| `supabase/functions/verify-paystack-status/index.ts` | "Restore" latest Paystack subscription | JWT likely required, but function does not verify JWT/user ownership | Yes | Extends Premium from latest completed subscription row. |
| `supabase/functions/revenuecat-webhook/index.ts` | RevenueCat webhook updates subscriptions, profiles, boosts, ledger | No Supabase JWT; shared Authorization secret | Yes | Handles purchase, renewal, product change, expiration, refund, revoke, transfer. |

## SQL and Database Evidence

| Path | Purpose | Notes |
|---|---|---|
| `supabase_monetization_schema.sql` | Early wallets/transactions/referrals/withdrawals/RPCs | Historical and conflicting. |
| `supabase_monetization_v3.sql` | Subscriptions, boosts, swipe_limits, discovery visibility | Historical base. |
| `supabase_boosts_setup.sql` | Boost policies and `purchase_boost`/`use_super_swipe` | Missing auth guard in shown `purchase_boost` version. Current live state unverified. |
| `supabase/migrations/20260522101046_premium_swipe_entitlement_fix.sql` | Premium swipe limit/payment fix | Superseded by later migration. |
| `supabase/migrations/20260522101716_premium_subscription_swipe_rpc_fix.sql` | Treat active subscription as premium in swipe RPC | Superseded by later idempotency wrapper. |
| `supabase/migrations/20260523120000_production_security_hardening_phase_2.sql` | Admin/wallet/notification hardening | Important wallet/auth guard evidence. |
| `supabase/migrations/20260523123000_secure_paystack_wallet_credit.sql` | Server-only wallet credit RPC | Good hardening. |
| `supabase/migrations/20260523124500_money_rpc_auth_guards.sql` | Auth guards for money RPCs | Good for gift/referral operations. |
| `supabase/migrations/20260715152000_offline_media_and_swipe_idempotency.sql` | Idempotent `process_swipe_payment` | Current best local evidence for swipe charging. |
| `supabase/migrations/2026071615*.sql` | Admin finance/read/write gates | Current best local evidence for admin control and audit logs. |

## Duplicate or Conflicting Implementations

- `transactions` table exists in older SQL while app uses `wallet_transactions`.
- Wallet schema is split historically between `balance` and `available_balance`.
- Swipe limit state is split between `swipe_limits.swipes_used` and `profiles.free_swipes`.
- Boost purchase exists as wallet RPC and RevenueCat product path.
- Premium truth is split between `profiles.is_premium`, `profiles.premium_expires_at`, and `subscriptions`.
- Paystack restore and Paystack transaction verification use separate Edge Functions with different security properties.
