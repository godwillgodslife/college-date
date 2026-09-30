# Production RLS Verification

Date: 2026-07-25

Status: Passed

## Method

Direct production database/RPC checks were run with transaction-scoped authenticated-role simulation. Temporary premium entitlement checks were executed inside a rollback-only transaction so no persistent test entitlement remained.

## Viewer and Admirer Identity Protection

Free-user checks:

- `get_profile_viewers_secure`: returned locked items only.
- `get_admirers_secure`: returned locked items only.
- Free user response hid user IDs, profile IDs, names, photos, schools, bios, and exact identity timestamps.

Temporary premium checks:

- A rollback-only premium entitlement allowed unlocked viewer/admirer identity data.
- Rollback verification confirmed no test entitlement persisted.

## Privilege Checks

Post-hardening privilege checks confirmed:

- Authenticated users cannot insert entitlements.
- Authenticated users cannot modify entitlement expiration directly.
- Authenticated users cannot create successful payment attempts directly.
- Authenticated users cannot insert wallet ledger rows.
- Authenticated users cannot update wallet ledger records.
- Authenticated users cannot update product catalogue prices.
- Authenticated users cannot read webhook events.
- Authenticated users cannot read audit logs.

## Table RLS

RLS is enabled on:

- `paid_products`
- `payment_attempts`
- `provider_webhook_events`
- `entitlements`
- `wallet_ledger`
- `payment_audit_logs`
- `monetization_config`

## Limitations

Browser-authenticated JWT storage was not accessible from the automation context, so authenticated HTTP probes for another user's payment records were not repeated with a live browser token. The direct database/RPC simulation and privilege checks passed.
