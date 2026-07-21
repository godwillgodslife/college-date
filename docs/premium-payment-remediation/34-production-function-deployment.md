# Production Edge Function Deployment

Date: 2026-07-21

Status: Blocked

## Current Production Functions

`npx supabase functions list --project-ref gedoyoleoscgxgdqszzc` showed these active functions:

- `send-notification-email`
- `send-notification-push`
- `notify-on-event`
- `verify-paystack-status`
- `revenuecat-webhook`
- `ai-profile-review`
- `ai-assistant`
- `verify-paystack-transaction`
- `zego-call-token`
- `agora-call-token`
- `admin-push-broadcast`

## Required Remediation Functions

Not deployed in this change window:

- `initialize-paystack-payment`
- `verify-paystack-transaction`
- `verify-paystack-status`
- `paystack-webhook`
- `revenuecat-webhook`

## Required Secrets

Exact secret names required by function code:

- `SUPABASE_URL`: configured
- `SUPABASE_SERVICE_ROLE_KEY`: configured
- `PAYSTACK_SECRET_KEY`: blocked
- `REVENUECAT_WEBHOOK_AUTH`: configured
- `PUBLIC_SITE_URL`: blocked
- `SITE_URL`: blocked

Notes:

- `PAYSTACK_SECRET_KEY` is required by `initialize-paystack-payment`, `verify-paystack-transaction`, and `paystack-webhook`.
- `PUBLIC_SITE_URL` or `SITE_URL` should be set to `https://www.thecollegedate.com` to pin the Paystack callback origin.
- Existing legacy secret names with spaces must not be assumed by the new code.

## Deployment Result

Not started.

## Reason

Function deployment depends on the new database tables/RPCs and required secret names. The database migration was blocked by backup availability, and `PAYSTACK_SECRET_KEY` was not configured under the exact required name.
