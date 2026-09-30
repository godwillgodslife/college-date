# Production Webhook Configuration

Date: 2026-07-25

Status: Passed

## Paystack

Target webhook URL:

```text
https://gedoyoleoscgxgdqszzc.supabase.co/functions/v1/paystack-webhook
```

Function status: Passed

Provider dashboard configuration status: Passed

Verified from this environment:

- `paystack-webhook` is deployed with JWT verification disabled.
- The endpoint is publicly reachable.
- Invalid signatures are rejected with HTTP 401.
- `PAYSTACK_SECRET_KEY` exists under the exact required Supabase secret name.
- `provider_webhook_events` exists and is empty before live provider events.

Operator confirmation:

- User confirmed the Paystack Live webhook URL was set to the target `paystack-webhook` endpoint.

Previous webhook destination:

- Not captured before replacement. Paystack dashboard/API access was not available from this environment without a production Paystack dashboard session or an API call that would reveal/use the provider secret.

## RevenueCat

Target webhook URL:

```text
https://gedoyoleoscgxgdqszzc.supabase.co/functions/v1/revenuecat-webhook
```

Function status: Passed

Provider dashboard configuration status: Passed

Verified from this environment:

- `revenuecat-webhook` is deployed with JWT verification disabled.
- Invalid authorization is rejected with HTTP 401.
- `REVENUECAT_WEBHOOK_AUTH` exists under the exact required Supabase secret name.
- Local entitlement identifier expected by code: `Premium`.
- Local premium product prefix expected by code: `premium_monthly`.
- Local webhook code requires RevenueCat app user IDs to map to Supabase UUIDs.

Operator confirmation:

- User confirmed the RevenueCat production webhook is configured to the target `revenuecat-webhook` endpoint.

Not directly verified from this environment:

- Whether duplicate production RevenueCat events are arriving at the new endpoint.
- Whether Play Store product mapping in the dashboard currently matches live production products.

## Safe Invalid Request Testing

Safe invalid webhook tests passed:

- Paystack invalid signature: rejected.
- RevenueCat invalid authorization: rejected.

## Required User-Side Confirmation

Provider dashboard configuration has been operator-confirmed. The remaining gate is one controlled live payment test and replay verification.
