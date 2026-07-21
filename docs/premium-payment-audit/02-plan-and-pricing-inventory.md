# Plan and Pricing Inventory

## Product Catalog

| Item | User-facing name | SKU/product | Price | Provider | Platform | Interval | Active in UI | Backend exists |
|---|---|---|---:|---|---|---|---:|---:|
| Premium monthly | Elite Plan / Premium | Web has no SKU; Android expects `premium_monthly:monthly-base` | NGN 2,900 | Paystack web, RevenueCat/Google Play native, wallet | Web/Android | Monthly/30 days | Yes | Yes |
| 24h Boost | 24h Visibility Boost | `24h_boost` | NGN 1,000 | Wallet on web, RevenueCat on native if package exists | Web/Android | One-time, 24 hours | Yes | Yes |
| Super Swipe | Super Swipe Credit | `super_swipe` | NGN 500 | Wallet on web, RevenueCat on native if package exists | Web/Android | One-time, expires 30 days | Yes | Yes |
| Standard request | Standard swipe/request | `standard` swipe | NGN 500 after free allowance | Wallet | Web/Android | Per action | Yes | Yes |
| Premium request | Premium swipe/request | `premium` swipe | NGN 5,000 | Wallet | Web/Android | Per action | Partially surfaced | Yes |
| Gifts | Digital Rose, Cold Zobo, Hot Suya, Airtime, L-Time | local IDs `rose`, `zubo`, `suya`, `airtime`, `l_time` | NGN 200-5,000 | Wallet | Web/Android | Per action | Yes | Yes via RPC/table |
| Wallet deposit | Wallet funding | Paystack reference `CD-TX-{tx.id}` | Minimum NGN 2,000 | Paystack | Web/Android shell | One-time | Yes | Yes |
| Withdrawal | Earnings payout | N/A | Minimum NGN 15,000 | Manual/admin | Web/Android shell | One-time | Yes | Yes |

## Pricing Consistency

| Area | Value | Evidence | Status |
|---|---|---|---|
| Premium page price | NGN 2,900/month | `src/pages/PremiumUpgrade.jsx` | Consistent with webhook hardcode |
| Paystack subscription amount | 2900 | `src/pages/PremiumUpgrade.jsx`, `verify-paystack-transaction` compares to transaction amount | Risk: backend does not own catalog |
| RevenueCat subscription amount in ledger | 2900 | `supabase/functions/revenuecat-webhook/index.ts` | Risk: hardcoded, not provider-derived |
| Android product | `premium_monthly:monthly-base` | AGENTS handoff, prototype constants | UNVERIFIED - ACCESS REQUIRED |
| Boost price | 1000 | UI and RevenueCat webhook | Mostly consistent |
| Super Swipe price | 500 | UI and RevenueCat webhook | Mostly consistent |
| Standard swipe | 500 | `Match.jsx`, `process_swipe_payment` | Consistent |
| Premium swipe | 5000 | `Match.jsx`, `process_swipe_payment` | Consistent |
| Free swipe daily limit | 10 vs 20 | Premium page says 10/day, Auth default/check RPC uses 20 | Inconsistent |
| Admin config default | `free_daily_swipes`, `premium_swipe_price` | admin migrations | Not wired into swipe RPC in current local evidence |

## Missing Provider Verification

- Google Play Console price, base plan, grace period and region pricing are unverified.
- RevenueCat current offering contents are unverified.
- Paystack recurring plan/subscription configuration was not found; web Premium appears as one-off 30-day activation.
