# Production Backfill Results

Date: 2026-07-21

Status: Blocked

## Analysis

Existing premium records were classified before any writes:

- `confirmed_active_paystack`: 0
- `confirmed_active_revenuecat`: 0
- `active_legacy`: 0
- `expired`: 1
- `conflicting`: 0
- `missing_evidence`: 0
- `requires_manual_review`: 13 pending subscription wallet transactions

The one legacy Premium subscription row is expired:

- `plan_type = Premium`
- `status = active`
- `current_period_end = 2026-05-22 09:29:24.727+00`
- Matching profile has `is_premium = false`
- Matching profile has expired `premium_expires_at`

No active provider-confirmed Premium record was found in the inspected production tables.

## Backfill Execution

Not started.

Reason:

- Migration not applied because backup availability was not confirmed.
- No active premium evidence exists that should be backfilled automatically.

## Safe Idempotent Backfill Script

After the migration is applied, this script is safe to run. Based on the current production analysis, it should create no entitlements unless active provider-confirmed evidence appears later.

```sql
begin;

with active_candidates as (
    select
        s.user_id,
        'active_legacy'::text as classification,
        s.current_period_start as starts_at,
        s.current_period_end as expires_at
    from public.subscriptions s
    join public.profiles p on p.id = s.user_id
    where s.plan_type = 'Premium'
      and s.status = 'active'
      and (s.current_period_end is null or s.current_period_end > now())
      and (p.premium_expires_at is null or p.premium_expires_at > now())
),
inserted as (
    insert into public.entitlements (
        user_id,
        entitlement_key,
        product_id,
        source,
        source_reference,
        status,
        starts_at,
        expires_at,
        metadata
    )
    select
        c.user_id,
        entitlement_key,
        'premium_monthly',
        'legacy_backfill',
        'legacy-subscription-' || c.user_id::text,
        'active',
        coalesce(c.starts_at, now()),
        c.expires_at,
        jsonb_build_object('classification', c.classification, 'backfilled_at', now())
    from active_candidates c
    cross join unnest(array[
        'premium',
        'unlimited_swipes',
        'see_admirers',
        'see_profile_viewers',
        'advanced_filters',
        'premium_badge'
    ]) as entitlement_key
    on conflict (user_id, entitlement_key, source, source_reference) do nothing
    returning user_id
)
insert into public.payment_audit_logs (
    actor_user_id,
    action,
    provider,
    provider_reference,
    product_id,
    result,
    metadata
)
select distinct
    user_id,
    'legacy_entitlement_backfill',
    'legacy',
    'legacy-subscription-' || user_id::text,
    'premium_monthly',
    'success',
    jsonb_build_object('source', 'production_backfill', 'migration', '20260721120000')
from inserted;

commit;
```

## Counts

- Users analyzed: 478
- Entitlements created: Not Started
- Entitlements skipped: Not Started
- Expired records: 1
- Conflicting records: 0
- Manual review records: 13
- Duplicate records prevented: Not Started
