# Usage Limit Audit

## Limits Found

| Limit | Value | Enforced frontend | Enforced backend | Notes |
|---|---:|---:|---:|---|
| Daily standard right swipes | 20 in code/RPC; 10 in premium copy | Yes | Partially | Split between `swipe_limits` and `profiles.free_swipes`. |
| Premium standard swipes | Unlimited | Yes | Yes in `process_swipe_payment` | Uses profile/subscription premium check. |
| Standard paid request | NGN 500 | Yes | Yes | Wallet row locked in latest RPC. |
| Premium request | NGN 5,000 | Yes | Yes | Naming may confuse with Premium subscription. |
| Super Swipe credits | Purchased credits | Yes | `send_super_swipe` unverified | Consumed by RPC from app. |
| 24h Boost | One active at a time in UI | Yes | Wallet RPC/webhook | Concurrent purchases/live DB uniqueness unverified. |
| Gifts | Wallet balance | Yes | Yes via RPC | Local gift list can drift from DB gift table. |
| Calls | Freemium call minutes referenced in handoff/code | Partial | Unverified | Not fully audited as payment feature. |

## Race and Bypass Notes

- Latest `process_swipe_payment` uses `FOR UPDATE` on wallet, which reduces concurrent wallet overspend risk.
- Offline paid swipe idempotency table prevents duplicate charges for a client operation ID.
- Free swipe limit implementation is inconsistent. The latest idempotency RPC calls `check_and_reset_swipe_limit` but does not increment `swipe_limits.swipes_used`; it decrements `profiles.free_swipes` instead.
- `checkSwipeLimit` fails open on errors by returning `canSwipe: true`.

## Recommended Tests

- Parallel 10 right-swipe requests with low wallet balance.
- Parallel duplicate offline sync operations with same `clientOperationId`.
- New free user with `profiles.free_swipes=0` but `swipe_limits.swipes_used=0`.
- Expired Premium user attempting standard swipe.
