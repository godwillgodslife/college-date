# Error and Recovery Audit

| Failure | Current behavior | Recovery | Risk |
|---|---|---|---|
| Paystack unavailable | Frontend catches script/init error | User retries | Low/Medium |
| Paystack succeeds but callback interrupted | No webhook found | Manual support/restore if transaction row completed, otherwise difficult | High |
| Paystack verification times out | User sees failure toast | Retry possible if pending tx retained | Medium |
| Entitlement update fails after Paystack verify | Error response/support toast | Manual support | High |
| Wallet credit fails after deposit verify | Error response/support toast | Manual support | High |
| Duplicate Paystack callback | Completed tx returns idempotent success | Good if same tx | Low |
| Paystack refund | No handler found | Manual | High |
| RevenueCat webhook delayed | Android local success; Supabase stale | Wait/retry support | Medium |
| RevenueCat duplicate event | Subscription ledger can duplicate/error | Provider retry | Medium |
| RevenueCat refund/revoke | Deactivates Premium | Good, pending out-of-order tests | Medium |
| Wallet subscription partial failure | Deducted before entitlement writes | Manual support | High |
| Android restore | Local restore only | Unclear Supabase sync | Medium |
| Offline paid swipe | Disabled unless env flag; idempotency migration exists | Queue sync | Medium |

## Payment Without Access Scenarios

- Browser closes after Paystack payment before callback.
- Paystack verification updates transaction but profile/subscription update fails.
- Wallet-funded Premium deduction succeeds and entitlement write fails.
- RevenueCat purchase succeeds but webhook is unavailable/delayed and local app state is refreshed from stale Supabase.

## Access Without Payment Scenarios

- Paystack client-created transaction amount manipulation.
- Paystack restore from historical completed transaction.
- Manual/stale `profiles.is_premium=true` with null expiry.
