# Android Internal Test

Date: 2026-07-21

## Status

Status: Blocked

No Android internal test build was produced during this pass.

## Reason blocked

- Backend staging deployment is not available.
- Paystack sandbox verification has not passed.
- RevenueCat sandbox verification has not passed.
- Netlify preview against staging has not passed.
- The remediation migration and updated Edge Functions are not deployed.

Building a new Android release before backend verification would not validate the remediated payment system.

## Required internal test matrix

Status: Not Started

- Fresh install and login.
- Restore existing premium user state.
- Start Google Play sandbox premium purchase.
- Complete Google Play sandbox premium purchase.
- Confirm RevenueCat entitlement appears in the app.
- Confirm entitlement sync after app restart.
- Confirm premium benefits apply in Match, Viewers, Requests, and Chat.
- Confirm expired/refunded sandbox entitlement removes premium access.
- Confirm Paystack web path is not used inside native Android purchase flow.
- Confirm logout clears local state and restored session behaves correctly.

## Production decision

Status: Blocked

Do not upload a new Android payment-remediation build to internal testing until backend staging and sandbox provider gates have passed.
