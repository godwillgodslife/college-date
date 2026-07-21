# Admin Controls Audit

## Confirmed Admin Finance Surfaces

- `AdminDashboard.jsx` reads wallets, transaction ledger, revenue breakdown, pending payments, and app config.
- Admin finance RPCs include `admin_get_wallets` and `admin_get_transactions`.
- Later migrations add permission gates such as `admin_has_permission('finance:read')` and `finance:payouts`.
- Admin actions write audit logs for moderation, config, promo code, and withdrawal review.

## Premium-Related Admin Capabilities Found

| Capability | Found | Notes |
|---|---:|---|
| View premium users | Yes | User search/filter includes premium. |
| View payment history | Yes | Transaction ledger. |
| Search references | Yes | Ledger search/filter UI. |
| View wallet balances | Yes | Finance tab. |
| Change free swipe config | Yes | `free_daily_swipes` admin config, but app/RPC wiring is incomplete. |
| Change premium swipe price | Yes | `premium_swipe_price` config, but swipe RPC uses hardcoded values. |
| Grant/revoke Premium | No direct UI found | Manual DB/support process likely required. |
| Extend Premium | No direct UI found | Missing operational tool. |
| Refund/chargeback handling | No | Provider dashboard/manual only. |

## Admin Control Gaps

- No explicit manual Premium adjustment workflow with reason, previous value, new value, expiry, and audit record.
- Config values for swipe limits/prices appear disconnected from enforcement logic.
- Pending payment triage exists as a read view, but no reconciliation workflow was found.

## Recommended Admin Fix

Add an audited `admin_adjust_entitlement` RPC and UI with:

- admin identity
- target user
- previous entitlement
- new entitlement
- reason
- expiry date
- provider/reference link
- automatic audit log
