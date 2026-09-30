# Production Edge Function Deployment

Date: 2026-07-25

Status: Passed

## Required Secrets

Exact secret names required by function code:

- `SUPABASE_URL`: configured
- `SUPABASE_SERVICE_ROLE_KEY`: configured
- `PAYSTACK_SECRET_KEY`: configured
- `REVENUECAT_WEBHOOK_AUTH`: configured
- `PUBLIC_SITE_URL`: configured

Notes:

- `PUBLIC_SITE_URL` is set to `https://www.thecollegedate.com`.
- `SITE_URL` is optional fallback only and is not required while `PUBLIC_SITE_URL` is present.
- Secret values were not printed.
- The Supabase secret list confirms names only; provider dashboard/live-key mode still needs provider-side confirmation.

## Deployed Functions

`npx supabase functions list --project-ref gedoyoleoscgxgdqszzc` verified:

- `initialize-paystack-payment`: ACTIVE, JWT verification enabled
- `verify-paystack-transaction`: ACTIVE, JWT verification enabled
- `verify-paystack-status`: ACTIVE, JWT verification enabled
- `paystack-webhook`: ACTIVE, JWT verification disabled
- `revenuecat-webhook`: ACTIVE, JWT verification disabled

## Safe Invalid Request Tests

Safe probes were run without real payment charges:

- `initialize-paystack-payment` missing auth: HTTP 401, `Missing authorization header`
- `verify-paystack-transaction` missing reference: HTTP 400, `reference is required`
- `verify-paystack-status` anonymous token: HTTP 401, `Not authenticated`
- `paystack-webhook` invalid signature: HTTP 401, `Invalid signature`
- `revenuecat-webhook` invalid auth: HTTP 401, `Unauthorized`

After probes, these tables remained unchanged:

- `payment_attempts`: 0
- `provider_webhook_events`: 0
- `entitlements`: 0
- `wallet_ledger`: 0
- `payment_audit_logs`: 0

## Type Checking

The user-provided local status before production rollout reported Deno Edge Function type-checking passed. Fresh local `deno check` could not be repeated in this environment because `deno` is not installed.
