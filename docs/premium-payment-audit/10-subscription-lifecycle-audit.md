# Subscription Lifecycle Audit

## Web Paystack Lifecycle

| Stage | Current behavior | Gap |
|---|---|---|
| Plan selection | Single hardcoded Premium monthly | No backend catalog |
| Checkout init | Browser inserts pending transaction | Client controls amount/type |
| Payment auth | Paystack Inline | Popup/close risk |
| Verification | Edge Function verifies Paystack reference | No webhook fallback |
| Activation | Sets profile/subscription for 30 days from verification time | No Paystack recurring subscription lifecycle |
| Renewal | Not found | Missing |
| Cancellation | Not found | Missing |
| Expiration | Helper treats expired dates as inactive | No scheduled cleanup/notification found |
| Refund | Not found | Missing |
| Restore | Re-verifies latest completed transaction and grants fresh 30 days | High risk |

## Android RevenueCat Lifecycle

| Stage | Current behavior | Gap |
|---|---|---|
| Offering load | Uses RevenueCat current offering | Provider config unverified |
| Purchase | Purchases selected package | Pending/error states limited |
| Activation | RevenueCat customerInfo checked locally; Supabase via webhook | Webhook delay not clearly surfaced |
| Renewal | Webhook handles `RENEWAL` | Price/currency hardcoded in ledger |
| Cancellation | Not explicitly deactivated, likely stays active until expiration | Needs policy/wording confirmation |
| Grace/account hold | Expiry may use grace expiration | Status not represented |
| Expiration/refund/revoke | Webhook deactivates | Out-of-order behavior untested |
| Restore | RevenueCat wrapper exists | Settings does not call it |

## Product Wording Match

The UI says "Billed monthly. Cancel anytime." Android can match this through Google Play subscriptions. Web Paystack appears to be a 30-day one-off activation unless Paystack subscription IDs are managed elsewhere; this wording needs clarification.
