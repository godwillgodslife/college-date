# Premium Payment Remediation Backfill Dry Run

Date: 2026-07-21

## Status

Status: Blocked

No backfill was executed and no production data was modified.

The required dry-run could not be completed because no staging Supabase project or staging clone was available. The linked Supabase project is production (`gedoyoleoscgxgdqszzc`), so only read-only aggregate inspection was performed.

## Read-only production aggregate snapshot

The following exact row counts were collected with `npx supabase db query --linked`:

| Table | Row count |
| --- | ---: |
| `boosts` | 2 |
| `matches` | 164 |
| `notifications` | 16,600 |
| `profiles` | 478 |
| `subscriptions` | 414 |
| `swipes` | 7,891 |
| `wallet_transactions` | 170 |

The new remediation tables were not present remotely at inspection time:

- `paid_products`
- `payment_attempts`
- `provider_webhook_events`
- `entitlements`
- `wallet_ledger`
- `payment_audit_logs`
- `monetization_config`

## Intended dry-run classification

Run this only on staging or a verified database clone after applying the remediation migration:

```sql
select
  count(*) filter (
    where coalesce(status, '') in ('active', 'trialing')
       or current_period_end > now()
  ) as active_subscription_candidates,
  count(*) filter (
    where coalesce(status, '') in ('cancelled', 'expired', 'inactive')
       and (current_period_end is null or current_period_end <= now())
  ) as inactive_subscription_candidates,
  count(*) as total_subscription_rows
from public.subscriptions;

select
  type,
  payment_method,
  count(*) as transaction_count,
  sum(coalesce(amount, 0)) as total_amount
from public.wallet_transactions
group by type, payment_method
order by type, payment_method;
```

Expected dry-run outputs:

- Number of active premium entitlement candidates.
- Number of inactive/expired subscription candidates.
- Wallet transaction categories that should become ledger entries.
- Any rows that cannot be mapped because of missing user IDs, missing references, impossible dates, or unsupported payment methods.

## Required staging acceptance criteria

Status: Not Started

- Migration applies on a staging clone without errors.
- Entitlement backfill produces deterministic counts.
- Wallet ledger backfill preserves balances and source references.
- Duplicate payment/provider references are either rejected or idempotently ignored.
- Rollback script has been rehearsed on staging.
- Counts before and after backfill reconcile.

## Production decision

Status: Blocked

Do not run the backfill in production until the dry-run and reconciliation have passed on staging.
