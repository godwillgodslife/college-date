# RLS Verification

Date: 2026-07-21

## Status

Status: Blocked

Full RLS verification was not completed because the remediation migration has not been applied to staging or production.

## Read-only remote snapshot

The linked production project currently has RLS enabled on the inspected legacy tables:

| Table | RLS enabled | Policy count |
| --- | --- | ---: |
| `boosts` | true | 3 |
| `matches` | true | 5 |
| `notifications` | true | 3 |
| `profiles` | true | 8 |
| `subscriptions` | true | 1 |
| `swipes` | true | 8 |
| `wallet_transactions` | true | 3 |

The new remediation tables are not present remotely yet, so their policies cannot be verified remotely.

## Function privilege spot-check

Status: Passed for existing hardening, Not Applicable for new RPCs

Existing production privileges show earlier wallet/admin hardening is still in effect:

- `increment_wallet_balance`: executable by `postgres` and `service_role`, not `authenticated`.
- `increment_wallet_balance_admin`: executable by `postgres` and `service_role`, not `authenticated`.
- `make_admin`: executable by `postgres` and `service_role`, not `authenticated`.
- `reset_swipe_limits`: executable by `postgres` and `service_role`, not `authenticated`.
- `decrement_wallet_balance`: executable by `authenticated`; existing implementation is expected to guard the authenticated user.

The new remediation RPCs were not found remotely:

- `process_verified_payment`
- `purchase_premium_with_wallet`
- `grant_paid_product_entitlements`
- `get_profile_viewers_secure`
- `get_admirers_secure`
- `get_my_entitlements`
- `has_entitlement`
- `get_monetization_config`

## Required RLS tests after staging migration

Status: Not Started

Use at least three accounts:

- Free authenticated user.
- Premium authenticated user.
- Unrelated authenticated user.

Required checks:

- Free user cannot read another user's payment attempts, wallet ledger, audit logs, or entitlements.
- Premium user can read only their own entitlement state.
- Unrelated user cannot infer viewers/admirers identities through direct table reads.
- Secure viewer/admirer RPCs return only allowed rows.
- Anonymous users cannot access private monetization data.
- Clients cannot insert provider webhook events, wallet ledger entries, payment audit logs, or entitlements directly.
- Service-role functions can process verified provider events idempotently.

## Production decision

Status: Blocked

Do not apply the migration to production until RLS behavior passes on staging with real authenticated sessions.
