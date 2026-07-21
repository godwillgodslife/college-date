# Paystack Sandbox Results

Date: 2026-07-21

## Status

Status: Blocked

Paystack sandbox testing was not completed during this pass.

## Reason blocked

- No staging Supabase project or staging clone was available.
- The linked Supabase project is production.
- The exact required Supabase secret name `PAYSTACK_SECRET_KEY` was not visible in the remote secret list.
- No Paystack dashboard access or sandbox webhook endpoint configuration was available through the local tooling.
- New backend functions required for the full flow are not deployed:
  - `initialize-paystack-payment`
  - `paystack-webhook`

## Required sandbox test matrix

Status: Not Started

- Initialize wallet funding payment from a free user.
- Initialize web premium payment from a free user.
- Confirm invalid plan/product IDs are rejected.
- Confirm amount tampering is rejected server-side.
- Complete a successful Paystack test payment.
- Verify payment server-side before granting wallet credit or premium access.
- Replay the same Paystack webhook and confirm idempotency.
- Send an invalid webhook signature and confirm rejection.
- Send a failed/abandoned transaction and confirm no entitlement or wallet credit is granted.
- Confirm audit logs and provider webhook events are created.

## Production decision

Status: Blocked

Do not enable the remediated Paystack production path until sandbox initialization, verification, webhook replay, idempotency, and negative tests pass.
