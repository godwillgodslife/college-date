# Cross-Platform Synchronization Audit

## Confirmed Sync Mechanisms

- Web and Android share Supabase auth/profile/subscription tables.
- `AuthContext` fetches both `profiles` and `subscriptions` on login/auth events.
- Local cache stores auth profile for 10 minutes and wallet for 2 minutes.
- Premium helper checks profile or subscription state.
- RevenueCat uses Supabase user ID as app user ID.

## Sync Risks

- Android purchase state is local immediately, but shared Supabase entitlement depends on webhook delivery.
- RevenueCat restore does not explicitly update Supabase from the app.
- Web Paystack purchase updates Supabase, so Android sees it after auth/profile refresh.
- Local cached profile can temporarily show stale premium/free state.
- A stale `profiles.is_premium=true` without expiry can grant access indefinitely in frontend helper.

## Expected Propagation

| Source | Destination | Expected current behavior |
|---|---|---|
| Web Paystack Premium | Android | Works after Supabase profile/subscription refresh |
| Android Google Play Premium | Web | Works after RevenueCat webhook updates Supabase |
| Android restore | Web | Unreliable unless RevenueCat emits webhook or user later receives event |
| Expiration/refund | App | RevenueCat path works after webhook/profile refresh; Paystack path lacks provider lifecycle |

## Recommended Fix

Create `get-effective-entitlement` and `sync-revenuecat-entitlement` backend functions. The app should call them after purchase, restore, login, and app resume.
