# Notifications and Receipts Audit

## Confirmed Communications

| Event | Current user communication |
|---|---|
| Paystack deposit success | In-app toast and notification "Deposit Successful" |
| Paystack Premium success | In-app toast and notification "Premium Activated" |
| Wallet Premium success | In-app toast and notification |
| Boost purchase success | In-app toast |
| Payment activation failure | Toast: contact support |
| Restore success/failure | Toast in Settings |
| Swipe paid/free result | Toast in Match |
| Wallet support | WhatsApp support link |

## Missing or Weak Communications

- No formal receipt/invoice view found.
- No renewal reminder found.
- No cancellation confirmation found.
- No refund/chargeback notification found.
- No expiration warning found.
- No grace-period/account-hold message found.
- No provider transaction reference is shown prominently after Premium activation failure.
- Android pending purchase messaging is minimal.

## Recommendation

Add a Billing Activity screen or section that shows:

- plan/product
- amount and currency
- provider
- provider reference
- status
- paid date
- entitlement start/end
- support link

Avoid exposing full gateway payloads or sensitive tokens.
