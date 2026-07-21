# RevenueCat Sandbox Results

Date: 2026-07-21

## Status

Status: Blocked

RevenueCat sandbox testing was not completed during this pass.

## Current observed state

The production Supabase project has an existing deployed `revenuecat-webhook` function with JWT verification disabled, which is correct for direct RevenueCat webhook delivery. The local remediation changes add provider event logging and entitlement integration, but those local changes were not deployed.

## Reason blocked

- No staging Supabase project or staging clone was available.
- The linked Supabase project is production.
- No RevenueCat dashboard/tool access was available to configure a sandbox webhook target.
- The remediation migration that creates `provider_webhook_events` and `entitlements` has not been applied remotely.
- The updated local `revenuecat-webhook` depends on new tables/RPCs that do not exist in production yet.

## Required sandbox test matrix

Status: Not Started

- Sandbox Google Play subscription purchase grants `Premium` entitlement.
- Renewal keeps entitlement active.
- Expiration updates entitlement/profile/subscription state correctly.
- Refund or revoke removes active entitlement.
- Duplicate RevenueCat webhook event is ignored idempotently.
- Sandbox consumable boost purchase creates exactly one boost.
- Duplicate consumable event does not create a second boost.
- Cross-platform state sync reflects premium status in the web app and Android app.

## Production decision

Status: Blocked

Do not deploy the updated RevenueCat webhook to production until staging migration and sandbox webhook replay pass.
