# Production Webhook Configuration

Date: 2026-07-21

Status: Blocked

## Paystack

Target webhook URL:

```text
https://gedoyoleoscgxgdqszzc.supabase.co/functions/v1/paystack-webhook
```

Configuration status: Blocked

Reasons:

- `paystack-webhook` is not currently deployed.
- `PAYSTACK_SECRET_KEY` is not configured under the exact required Supabase secret name.
- The database idempotency table `provider_webhook_events` does not exist yet.

Previous webhook destination:

- Not verified in this change window. Paystack dashboard/API access was not available without the production secret/dashboard session.

## RevenueCat

Target webhook URL:

```text
https://gedoyoleoscgxgdqszzc.supabase.co/functions/v1/revenuecat-webhook
```

Configuration status: Blocked

Known configuration:

- `revenuecat-webhook` is deployed with JWT verification disabled.
- `REVENUECAT_WEBHOOK_AUTH` is configured.
- Local webhook code expects RevenueCat app user IDs to be Supabase UUIDs.
- Local entitlement identifier: `Premium`.
- Local premium product prefix: `premium_monthly`.

Reason for block:

- The updated RevenueCat webhook code depends on `provider_webhook_events` and `entitlements`, which are not present until the migration applies.

## Safe Invalid Request Testing

Not started. Safe invalid request testing should run only after migration, secrets, and function deployments succeed.
