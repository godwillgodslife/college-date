# Database Audit

## Payment and Premium Entities

| Entity | Purpose | Key fields from local evidence | Notes |
|---|---|---|---|
| `profiles` | User profile and premium denormalization | `is_premium`, `premium_expires_at`, `free_swipes`, `role`, `last_active` | Denormalized Premium source. |
| `subscriptions` | Subscription state | `user_id`, `plan_type`, `status`, `current_period_start`, `current_period_end`, Paystack IDs | One row per user in local schema. |
| `wallets` | Wallet balances | `user_id`, `available_balance`, `pending_balance`, `total_earned`, `total_spent`, `total_withdrawn`, `currency` | Earlier `balance` field exists in historical SQL. |
| `wallet_transactions` | Ledger | `user_id`, `wallet_id`, `type`, `amount`, `status`, `reference_id`, `payment_method`, `gateway_response`, `metadata` | Core audit trail. |
| `boosts` | Boost/super-swipe credits | `user_id`, `type`, `expires_at`, `multiplier` | Super Swipe credits modeled as boost rows. |
| `swipe_limits` | Daily limit counter | `user_id`, `swipes_used`, `last_reset` | Split with `profiles.free_swipes`. |
| `swipe_payment_operations` | Offline/idempotent swipe payment ops | `user_id`, `client_operation_id`, `result` | Good idempotency for offline paid swipes. |
| `swipes` | Requests/likes | `swiper_id`, `swiped_id`, `direction`, `type`, `status`, `is_free`, `is_priority` | Upserted before wallet payment. |
| `profile_views` | Viewer tracking | `viewer_id`, `profile_owner_id`, `source`, `created_at` | Premium UI blurs after fetching identity. |
| `withdrawals` | Payout requests | `user_id`, `amount`, `status`, admin fields | Client creates rows; admin review RPC later. |
| `payout_details` | User payout details | bank/account fields | User-managed. |
| `promo_codes` | Promotional config | code/discount/uses/expires | Admin functions exist, no frontend checkout use found. |

## Source of Truth Assessment

No single source of truth exists. Effective Premium currently comes from:

- `profiles.is_premium`
- `profiles.premium_expires_at`
- `subscriptions.plan_type/status/current_period_end`
- RevenueCat provider state for native purchases
- Paystack transaction history for web activation/restore

The app helper resolves profile/subscription state locally, but backend policies/RPCs do not consistently call one entitlement function.

## Safe Inconsistency Queries

```sql
-- Premium flag active but no active subscription row.
select p.id, p.email, p.is_premium, p.premium_expires_at
from public.profiles p
left join public.subscriptions s on s.user_id = p.id
where coalesce(p.is_premium, false) = true
  and not (
    s.plan_type = 'Premium'
    and s.status = 'active'
    and (s.current_period_end is null or s.current_period_end > now())
  );

-- Active subscription already expired.
select *
from public.subscriptions
where plan_type = 'Premium'
  and status = 'active'
  and current_period_end is not null
  and current_period_end <= now();

-- Completed subscription payments without active entitlement.
select wt.*
from public.wallet_transactions wt
left join public.subscriptions s on s.user_id = wt.user_id
where wt.type in ('subscription', 'payment')
  and wt.status in ('completed', 'success')
  and (wt.metadata->>'type' = 'subscription' or wt.description ilike '%premium%')
  and not (
    s.plan_type = 'Premium'
    and s.status = 'active'
    and (s.current_period_end is null or s.current_period_end > now())
  );

-- Duplicate provider references.
select reference_id, count(*)
from public.wallet_transactions
where reference_id is not null
group by reference_id
having count(*) > 1;

-- Stale profile premium flag after expiration.
select id, email, is_premium, premium_expires_at
from public.profiles
where is_premium = true
  and premium_expires_at is not null
  and premium_expires_at <= now();
```

## UNVERIFIED - ACCESS REQUIRED

The local `.codex-public-schema.sql` and `.codex-remote-public-schema.sql` files are empty, and the Supabase CLI is not installed in this environment. Live schema/RLS/function privileges require a fresh read-only dump or Supabase dashboard/CLI access.
