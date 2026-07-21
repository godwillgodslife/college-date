# Webhook Audit

## Implemented Webhooks

| Webhook | Implemented | Auth | Events |
|---|---:|---|---|
| RevenueCat | Yes | Static Authorization secret | Purchases, renewals, product changes, expiration, refund, revoke, transfer |
| Paystack | No | N/A | N/A |
| Flutterwave | No | N/A | N/A |
| Google Play RTDN direct | No | RevenueCat may abstract this | UNVERIFIED |

## RevenueCat Event Matrix

| Event | Current handling |
|---|---|
| `INITIAL_PURCHASE` | Activates Premium if entitlement/product matches; creates ledger row. |
| `RENEWAL` | Activates/extends Premium; creates ledger row. |
| `PRODUCT_CHANGE` | Activates/updates Premium; creates ledger row. |
| `NON_RENEWING_PURCHASE` | Used for boost products. |
| `EXPIRATION` | Sets `subscriptions` Free/expired and `profiles.is_premium=false`. |
| `REFUND` | Deactivates Premium. |
| `REVOKE` | Deactivates Premium. |
| `TRANSFER` | Deactivates Premium for old app user. |
| `CANCELLATION` | Not explicitly handled; effectively ignored. |
| Grace period | Expiry helper can use `grace_period_expiration_at_ms`, but no status such as grace/hold is stored. |
| Account hold | Not explicitly handled. |
| Duplicate subscription event | Not cleanly idempotent before insert. |
| Unknown event | Ignored unless premium entitlement/product path matches. |

## Webhook Findings

- Missing Paystack webhook creates payment-without-access risk when the browser callback is interrupted.
- RevenueCat webhook should store raw events in an event ledger before applying state.
- RevenueCat webhook should treat duplicate subscription transaction IDs as idempotent success.
- Webhook replay protection should include provider signature/timestamp if available, or nonce/event-id ledger.
