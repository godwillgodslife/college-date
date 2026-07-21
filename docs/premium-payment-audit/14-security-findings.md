# Security Findings

## F-001

Finding ID: F-001
Title: Paystack verification trusts client-created subscription amount and type
Severity: Critical
Category: Payment validation
Platform: Web backend
Affected file or component: `src/pages/PremiumUpgrade.jsx`, `src/services/paymentService.js`, `supabase/functions/verify-paystack-transaction/index.ts`
Current behaviour: The browser inserts a pending `wallet_transactions` row with amount/type, then the Edge Function verifies Paystack amount against that row.
Expected behaviour: Backend should create payment intents from a server-owned product catalog and never trust client amount/type for entitlement.
Evidence: `PremiumUpgrade.jsx` creates amount `2900`; Edge Function selects `tx.amount` and compares paid amount to `tx.amount`.
Reproduction steps: Create a pending subscription transaction with a lower amount, pay that amount via Paystack, then verify the reference.
User impact: Users may obtain Premium for less than intended.
Business impact: Direct revenue loss.
Security impact: Payment amount manipulation.
Root cause: Missing backend-owned plan catalog/payment-intent creation.
Recommended fix: Add `create-payment-intent` Edge Function with server-side plan IDs and signed/locked expected amounts.
Estimated complexity: Medium
Dependencies: Paystack config, migration for payment intents
Requires business approval: No
Requires payment-provider configuration: Possibly webhook
Requires database migration: Yes
Requires app release: Yes

## F-002

Finding ID: F-002
Title: Paystack restore can re-grant Premium from old completed transactions
Severity: High
Category: Entitlement lifecycle
Platform: Web backend
Affected file or component: `supabase/functions/verify-paystack-status/index.ts`, `src/pages/Settings.jsx`
Current behaviour: Function finds latest completed subscription transaction, verifies Paystack, and grants 30 days from now.
Expected behaviour: Restore should restore the original paid period, not create a new period indefinitely.
Evidence: Function computes `new Date(Date.now() + 30 days)` after verifying historical reference.
Reproduction steps: Pay once, wait until expiry, call restore again.
User impact: User can regain Premium without a new payment.
Business impact: Revenue leakage.
Security impact: Entitlement replay.
Root cause: Restore has no period/expiry ledger and no consumed-restoration guard.
Recommended fix: Store provider paid period and restore only current valid entitlement.
Estimated complexity: Medium
Dependencies: Payment ledger migration
Requires business approval: No
Requires payment-provider configuration: No
Requires database migration: Yes
Requires app release: Yes

## F-003

Finding ID: F-003
Title: Premium-only viewer and admirer identity appears frontend-only
Severity: High
Category: Authorization
Platform: Web/Android
Affected file or component: `src/pages/Viewers.jsx`, `src/pages/Requests.jsx`
Current behaviour: App fetches viewer/requester profile details and blurs them for free users in the UI.
Expected behaviour: Backend/RLS should withhold premium-only identity fields from free users.
Evidence: `Viewers.jsx` selects `viewer:profiles(...)`; `Requests.jsx` selects `swiper:profiles!swipes_swiper_id_fkey(*)` before checking Premium.
Reproduction steps: As free user, call the same Supabase select from devtools or a script.
User impact: Free users may access paid reveal data.
Business impact: Premium conversion loss.
Security impact: Broken access control if RLS permits the select.
Root cause: Premium gate applied after data fetch.
Recommended fix: Create entitlement-aware RPC/views that return redacted rows for free users.
Estimated complexity: Medium
Dependencies: Supabase RLS/function changes
Requires business approval: No
Requires payment-provider configuration: No
Requires database migration: Yes
Requires app release: Yes

## F-004

Finding ID: F-004
Title: Android wallet funding uses Paystack for wallet funds that buy digital goods
Severity: High
Category: Store policy/payment compliance
Platform: Android
Affected file or component: `src/pages/Wallet.jsx`, `src/pages/PremiumUpgrade.jsx`, wallet RPCs
Current behaviour: Wallet funding uses Paystack even in native shell; wallet funds can buy swipes/gifts and possibly Premium.
Expected behaviour: Android digital goods should use Google Play Billing unless a policy exception applies.
Evidence: `Wallet.jsx` calls `initializePaystack` without native exclusion.
Reproduction steps: Open Android app, go to Wallet, fund wallet, use funds for digital requests/gifts.
User impact: Possible payment confusion or rejected app updates.
Business impact: Play policy enforcement risk.
Security impact: Compliance rather than exploit.
Root cause: Shared web wallet flow is exposed inside Android.
Recommended fix: Disable external wallet funding for Android digital goods or route digital credits through Play Billing; get policy/legal review.
Estimated complexity: Medium/High
Dependencies: Product decision and Play policy review
Requires business approval: Yes
Requires payment-provider configuration: Yes
Requires database migration: Maybe
Requires app release: Yes

## F-005

Finding ID: F-005
Title: RevenueCat restore does not explicitly synchronize Supabase
Severity: Medium
Category: Cross-platform entitlement sync
Platform: Android/Web
Affected file or component: `src/services/paymentService.js`, `src/pages/Settings.jsx`
Current behaviour: RevenueCat restore wrapper returns customerInfo locally, but Settings calls Paystack restore only.
Expected behaviour: Android restore should update shared Supabase entitlement after provider verification.
Evidence: `restoreRevenueCatPurchases` exists but is not wired in Settings; no backend RC sync endpoint found.
Reproduction steps: Reinstall Android app, restore purchase, then log into web.
User impact: Paying user may not see Premium across devices.
Business impact: Support load/refund risk.
Security impact: Availability/integrity issue.
Root cause: Missing backend reconciliation path.
Recommended fix: Add authenticated RevenueCat sync endpoint and native restore UI.
Estimated complexity: Medium
Dependencies: RevenueCat REST/API or webhook event verification
Requires business approval: No
Requires payment-provider configuration: Maybe
Requires database migration: Maybe
Requires app release: Yes

## F-006

Finding ID: F-006
Title: Free swipe limit state and copy are inconsistent
Severity: Medium
Category: Usage limits
Platform: Web/Android/backend
Affected file or component: `src/pages/PremiumUpgrade.jsx`, `src/pages/Match.jsx`, swipe migrations
Current behaviour: Premium copy says 10/day; code defaults to 20. Limit read uses `swipe_limits`; payment RPC decrements `profiles.free_swipes`.
Expected behaviour: One backend source should define, count, and enforce the daily limit.
Evidence: `check_and_reset_swipe_limit` returns max 20; `PremiumUpgrade.jsx` says 10/day.
Reproduction steps: Compare Premium page to swipe badge and DB counters.
User impact: Confusing limits and possible surprise charges.
Business impact: Complaints/conversion loss.
Security impact: Limit bypass/drift risk.
Root cause: Dual counters and hardcoded copy.
Recommended fix: Use one `usage_limits`/RPC source and update UI copy from returned value.
Estimated complexity: Medium
Dependencies: Migration and frontend update
Requires business approval: Yes if changing actual limit
Requires payment-provider configuration: No
Requires database migration: Yes
Requires app release: Yes

## F-007

Finding ID: F-007
Title: RevenueCat webhook lacks complete replay/idempotency controls
Severity: Medium
Category: Webhook security/reliability
Platform: Backend
Affected file or component: `supabase/functions/revenuecat-webhook/index.ts`
Current behaviour: Static auth secret protects webhook; boost duplicates are checked, but subscription ledger insert is not pre-idempotent.
Expected behaviour: Store event IDs/transaction IDs and process each event idempotently with replay/timestamp checks.
Evidence: Subscription branch inserts `wallet_transactions` without existing transaction lookup.
Reproduction steps: Replay a valid RevenueCat renewal event.
User impact: Possible duplicate ledger totals or webhook 500 retries.
Business impact: Bad revenue reporting/support confusion.
Security impact: Replay risk if secret leaks.
Root cause: No webhook event ledger.
Recommended fix: Add `provider_events` table and idempotent processing by event/transaction ID.
Estimated complexity: Medium
Dependencies: Migration
Requires business approval: No
Requires payment-provider configuration: No
Requires database migration: Yes
Requires app release: No

## F-008

Finding ID: F-008
Title: Wallet-funded Premium can deduct before entitlement activation succeeds
Severity: Medium
Category: Partial failure
Platform: Web/Android
Affected file or component: `src/services/paymentService.js`
Current behaviour: `payWithWallet` inserts transaction, calls deduction RPC, then updates subscription/profile from client.
Expected behaviour: Wallet deduction and entitlement grant should be one database transaction/RPC.
Evidence: `payWithWallet` performs three separate client operations.
Reproduction steps: Force profile/subscription update RLS/network failure after wallet decrement.
User impact: User pays but does not receive Premium.
Business impact: Support/refund liability.
Security impact: Integrity issue.
Root cause: Non-atomic client-orchestrated financial state change.
Recommended fix: Create `purchase_premium_with_wallet` SECURITY DEFINER RPC with auth guard and transaction semantics.
Estimated complexity: Medium
Dependencies: Migration
Requires business approval: No
Requires payment-provider configuration: No
Requires database migration: Yes
Requires app release: Yes
## Remediation Status - 2026-07-21

- F-001: Remediated in local code. Paystack checkout now starts from server-owned `paid_products` and `payment_attempts`; verification checks server expected amount/currency/reference before atomic processing. Pending deployment and live sandbox verification.
- F-002: Remediated in local code. Paystack restore no longer grants a fresh 30-day Premium period from old `wallet_transactions`; it reports active entitlements/profile compatibility state only. Pending deployment.
- F-003: Remediated in local code for Viewers, Requests, and Chat activity teasers. These surfaces now use `get_profile_viewers_secure` and `get_admirers_secure`, which return locked rows without identity data for free users. Pending migration/RLS verification.
- F-004: Remediated in local code. Android wallet top-up via Paystack is disabled in the native shell; web wallet top-ups use fixed server catalog products.
- F-005: Partially remediated. RevenueCat webhook now records idempotent events and writes entitlements. A dedicated RevenueCat REST reconciliation/restore job is still recommended.
- F-006: Partially remediated. New monetization config seeds `free_swipes_per_day = 20`; older admin `free_daily_swipes` references still need consolidation.
- F-007: Remediated in local code. RevenueCat webhook now uses `provider_webhook_events` for duplicate detection. Pending deployment.
- F-008: Remediated in local code. Wallet Premium purchase now runs through `purchase_premium_with_wallet`, which locks the wallet, posts a ledger debit, and grants Premium in one database transaction.
