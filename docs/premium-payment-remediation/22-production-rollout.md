# Premium Payment Production Rollout

Date: 2026-07-21

## Status

Status: Blocked

Production rollout was not started.

## Actions intentionally not performed

- Did not apply `20260721120000_premium_payment_remediation_foundation.sql` to production.
- Did not deploy `initialize-paystack-payment`.
- Did not deploy `paystack-webhook`.
- Did not deploy updated `verify-paystack-transaction`.
- Did not deploy updated `verify-paystack-status`.
- Did not deploy updated `revenuecat-webhook`.
- Did not change Paystack webhook configuration.
- Did not change RevenueCat webhook configuration.
- Did not deploy Netlify production.
- Did not build or upload a new Android release bundle.

## Required production rollout sequence

Status: Not Started

1. Confirm staging has passed migration, backfill dry-run, RLS tests, Paystack sandbox, RevenueCat sandbox, Netlify preview, and Android internal test gates.
2. Capture production backup and verify restore path.
3. Confirm production Supabase secrets use exact required names.
4. Apply database migration during a quiet traffic window.
5. Run post-migration schema and RLS smoke checks.
6. Deploy Edge Functions in dependency order:
   - `initialize-paystack-payment`
   - `verify-paystack-transaction`
   - `verify-paystack-status`
   - `paystack-webhook`
   - `revenuecat-webhook`
7. Configure Paystack production webhook endpoint.
8. Configure RevenueCat production webhook endpoint if changing target/version.
9. Deploy Netlify production.
10. Run production smoke tests with low-risk accounts.
11. Build Android release and upload to internal testing.
12. Monitor provider webhooks, payment attempts, entitlement grants, wallet ledger, and support channels.

## Rollback notes

Status: Not Started

Minimum rollback preparation before production:

- Preserve the pre-migration database backup.
- Keep previous Edge Function versions or redeployable source available.
- Keep previous Netlify production deploy available for rollback.
- Document how to disable Paystack and RevenueCat webhook endpoints without losing provider event history.
- Confirm any entitlement grants created during partial rollout can be reconciled manually.

## Production decision

Status: Blocked

The system is not cleared for production rollout.
