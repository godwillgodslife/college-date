# Prioritized Remediation Roadmap

## Immediate - Critical

| Priority | Recommendation | Components | Migration | App release |
|---|---|---|---:|---:|
| P0 | Backend-owned Paystack payment intent/catalog | Edge Functions, `PremiumUpgrade`, `Wallet` | Yes | Yes |
| P0 | Fix Paystack restore replay | `verify-paystack-status`, subscriptions ledger | Yes | Yes |
| P0 | Backend-gate Premium-only reveal data | `Viewers`, `Requests`, RLS/RPCs | Yes | Yes |
| P0 | Add Paystack webhook with signature verification | Edge Function, ledger | Yes | No/Maybe |

## Before Next Release

| Priority | Recommendation | Components | Migration | App release |
|---|---|---|---:|---:|
| P1 | Add atomic wallet Premium purchase RPC | Payment service, SQL | Yes | Yes |
| P1 | Add RevenueCat sync/restore endpoint | Edge Function, Settings/Premium | Maybe | Yes |
| P1 | Align free swipe limit and copy | Match, Premium page, SQL/config | Maybe | Yes |
| P1 | Add webhook event ledger/idempotency | RevenueCat/Paystack functions | Yes | No |
| P1 | Android wallet/Paystack policy decision | Wallet, Play Billing catalog | Maybe | Yes |

## Medium-Term

| Priority | Recommendation | Components |
|---|---|---|
| P2 | Add billing history/receipt UI | Settings/Wallet/Admin |
| P2 | Add admin entitlement adjustment workflow | AdminDashboard, SQL audit logs |
| P2 | Add entitlement reconciliation scheduled job | Supabase scheduled function |
| P2 | Add cancellation/refund/expiration notifications | Notification service/functions |
| P2 | Add provider monitoring and alerting | Edge logs/admin ops |

## Optional Improvements

- Provider-derived pricing display on Android.
- Promotional codes wired into checkout.
- A/B testing for Premium conversion copy after technical fixes.
- Better pending activation UX.
