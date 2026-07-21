# Android Frontend Audit

## Confirmed Existing Behavior

- The production Android app is a Capacitor shell with package `com.collegedate.app`.
- Native platform detection in `PremiumUpgrade.jsx` routes Premium purchase to RevenueCat instead of Paystack.
- RevenueCat SDK is configured with `appUserID: userId`, tying purchases to the Supabase user ID.
- Android RevenueCat key guard rejects `test_` keys and expects a Google Play key.
- Native Premium package selection prefers `$rc_monthly`, `premium_monthly`, or products starting with `premium_monthly`.
- Restore purchase exists in `paymentService.js`, but Settings currently calls Paystack restore, not RevenueCat restore.
- Native prototype code expects offering `android_premium`, entitlement `Premium`, and product `premium_monthly:monthly-base`.

## Android-Specific Risks

- Android wallet funding still uses Paystack in `Wallet.jsx`. Because wallet funds can buy digital swipes, gifts, and possibly Premium, this needs Google Play policy review.
- RevenueCat purchase success shows a success toast immediately, but Supabase entitlement depends on the webhook.
- If RevenueCat webhook is delayed/unavailable, Android can show a local success but web/shared Premium may remain stale.
- `restoreRevenueCatPurchases` returns local customer info but does not call a backend sync endpoint.
- Pending purchases, account hold, grace period, upgrade/downgrade, and Google account switching were not testable locally.

## UNVERIFIED - ACCESS REQUIRED

- Play Console product/base plan configuration.
- RevenueCat current offering contents.
- Whether Real-time Developer Notifications are configured.
- Sandbox purchase behavior on a tester device.
- Actual Google Play formatted price and region/tax display.

## Recommended Android Fixes

- Add a visible native restore button that calls RevenueCat restore and then a backend reconciliation function.
- Add a "sync purchases" backend function that verifies RevenueCat customer/subscriber status for the authenticated Supabase user.
- Disable or route Android wallet funding/payment for digital goods through Google Play, or obtain legal/policy approval for the current wallet model.
- Poll/refetch Supabase entitlement after purchase until webhook state arrives or show a pending activation state.
