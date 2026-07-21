# Production RLS Verification

Date: 2026-07-21

Status: Blocked

## Current State

RLS is enabled on existing production `profiles`, `subscriptions`, `wallet_transactions`, and `wallets`.

The new remediation tables and RPCs do not exist yet, so production RLS verification for the new payment system could not be executed.

## Required Tests After Migration

Use controlled production accounts:

- Free user
- Premium test user
- Unrelated user

Verify direct API/RPC behavior, not only frontend screens:

- Free user calling `get_profile_viewers_secure` receives locked items only.
- Free user calling `get_admirers_secure` receives locked items only.
- Free user receives no viewer/admirer IDs, profile IDs, names, photos, schools, bios, or exact identity timestamps.
- Premium user receives unlocked viewer/admirer identity data.
- Unrelated user cannot read another user's payment attempts.
- Authenticated user cannot insert or update `entitlements`.
- Authenticated user cannot create successful `payment_attempts`.
- Authenticated user cannot insert or update `wallet_ledger`.
- Authenticated user cannot update product catalogue pricing.
- Authenticated user cannot read `provider_webhook_events`.
- Authenticated user cannot read `payment_audit_logs`.
- Authenticated user cannot read another user's transactions.

## Current Blocker

The database migration did not run because no recoverable production backup was visible.
