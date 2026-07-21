# Production Monitoring

Date: 2026-07-21

Status: Blocked

## Monitoring Checklist

Use this checklist after the rollout resumes:

- Payment initialization
- Payment verification
- Paystack webhook
- RevenueCat webhook
- Entitlement creation
- Wallet ledger
- Premium access
- Callback page
- Edge Function errors
- Webhook failures
- Amount mismatches
- Currency mismatches
- Unknown references
- Duplicate events
- Entitlement failures
- Wallet failures
- RLS errors
- Frontend callback failures

## Current Warnings

- No production migration was applied.
- No updated functions were deployed.
- No web deployment was performed.
- `PAYSTACK_SECRET_KEY` is not configured under the exact name required by the new code.
- Supabase CLI reports no listed backups and PITR disabled.

## Monitoring Status

Not started.
