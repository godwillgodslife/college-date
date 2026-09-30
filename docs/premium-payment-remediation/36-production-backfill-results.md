# Production Backfill Results

Date: 2026-07-25

Status: Passed

## Analysis

Existing premium records were classified before entitlement writes:

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
- `current_period_end` is in the past.
- Matching profile has `is_premium = false`.
- Matching profile has expired `premium_expires_at`.

No active provider-confirmed Premium record was found in the inspected production tables.

## Backfill Execution

Backfill script:

```text
docs/premium-payment-remediation/evidence/20260725-entitlement-backfill.sql
```

Execution result:

- Users analyzed: 540
- Entitlements created: 0
- Entitlements skipped: 540
- Expired records: 1
- Conflicting records: 0
- Manual review records: 13
- Duplicate records prevented: 0

## Post-Backfill Counts

- `entitlements`: 0
- `legacy_backfill` entitlements: 0
- `legacy_entitlement_backfill` audit logs: 0
- Pre-deployment active premium users: 0
- Post-deployment active premium users: 0

## Decision

No entitlement was created because production had no active valid premium evidence. Ambiguous pending subscription wallet transactions were left untouched for manual review.
