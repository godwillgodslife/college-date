# Production Backup Status

Date: 2026-07-25

Status: Passed

## Managed Backup Check

Latest command:

```bash
npx supabase backups list --project-ref gedoyoleoscgxgdqszzc
```

Result:

```json
{
  "region": "eu-west-1",
  "walg_enabled": true,
  "pitr_enabled": false,
  "backups": [],
  "physical_backup_data": {}
}
```

Managed scheduled backups and PITR are not available on the current Supabase Free plan.

## Manual Logical Backup Approval

The user approved proceeding on Supabase Free plan using manual logical backups instead of managed Supabase backups.

## Manual Snapshot

Snapshot schema:

```text
rollback_20260725_payment_remediation
```

Snapshot timestamp:

```text
2026-07-25T10:45:57.233837+00:00
```

Evidence file:

```text
docs/premium-payment-remediation/evidence/20260725-manual-logical-snapshot.sql
```

Captured table copies:

- `profiles`
- `subscriptions`
- `wallets`
- `wallet_transactions`
- `transactions`
- `boosts`

Captured metadata:

- Columns
- Constraints
- Constraint column mappings
- RLS policies
- Indexes
- Public functions
- Migration history
- Snapshot manifest

## Pre-Deployment Row Counts

- `profiles`: 540
- `subscriptions`: 476
- `wallets`: 517
- `wallet_transactions`: 171
- `transactions`: 0
- `boosts`: 2
- `profiles.is_premium = true`: 0
- Active profile premium: 0
- Premium subscriptions: 1
- Active premium subscriptions: 0

## Rollback Plan

1. Stop new payment starts first. Temporarily disable the frontend payment entry point with a Netlify rollback, or rotate/remove `PAYSTACK_SECRET_KEY` in Supabase only after explicitly recording the current secret state.
2. Revert the Netlify deployment from the `collegedate4` deploy history to the previous known-good production deploy. Current remediation deploy ID: `6a64a0c1a69438a17b15e4c3`.
3. Leave `payment_attempts`, `provider_webhook_events`, `entitlements`, `wallet_ledger`, and `payment_audit_logs` intact for reconciliation.
4. Preserve newly processed valid Paystack and RevenueCat evidence; do not delete wallet ledger or entitlement rows created from valid payments.
5. Preserve provider reference uniqueness so duplicate payment replay remains blocked during rollback.
6. If an RLS change must be reverted, apply a narrow forward migration that restores only the affected grant or policy after exporting affected rows.
7. If a newly deployed Edge Function must be disabled, prefer disabling the payment secret or redeploying a fail-closed function. Do not delete evidence tables.
8. Reconcile any payment attempts created during the rollback window against Paystack before granting or denying user access.

## Recovery Limitation

This manual logical snapshot is not equivalent to managed PITR. It is suitable for targeted restoration of affected public data and schema metadata, but it is not a full project-level physical backup.
