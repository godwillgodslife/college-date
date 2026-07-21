# Production Backup Status

Date: 2026-07-21

Status: Blocked

## Backup Check

Command:

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

## Backup Timestamp

No recoverable backup timestamp was visible from the Supabase Management API.

## Snapshot Status

Read-only aggregate snapshots were collected for:

- Existing table presence
- Existing columns
- Migration history
- Edge Function list
- Premium profile/subscription counts
- Wallet and wallet transaction counts
- Duplicate payment reference groups

The full `supabase db dump --linked --schema public` command timed out in this environment, so a complete schema dump file was not produced.

## Rollback Plan

If rollout resumes after backup availability is confirmed:

1. Record the visible backup timestamp immediately before migration.
2. Keep the previous Netlify production deploy ID before deploying the frontend.
3. Keep a copy of the previous Edge Function list and versions.
4. If a payment issue appears, immediately disable frontend payment entry points by rolling Netlify back to the previous deploy.
5. If backend payment initialization must be stopped without a frontend rollback, temporarily remove or rotate `PAYSTACK_SECRET_KEY` in Supabase secrets so initialization fails closed.
6. Do not delete `payment_attempts`, `provider_webhook_events`, `entitlements`, or `wallet_ledger` during rollback.
7. Preserve newly processed valid payments, wallet ledger entries, and entitlement records for reconciliation.
8. If RLS changes need reversal, use a narrow migration that restores previous grants/policies only after exporting the affected rows.
9. Prevent duplicate payment handling during rollback by keeping provider reference uniqueness intact and leaving webhook idempotency tables in place.

## Decision

Do not apply the production migration until a recoverable backup or explicit Supabase backup confirmation is available.
