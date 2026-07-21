# Premium Feature Entitlement Matrix

| Feature | Free access | Premium access | Frontend gate | Backend gate | Bypass risk |
|---|---|---|---|---|---|
| Registration/login | Yes | Yes | None | Supabase auth | Low |
| Profile creation/editing | Yes | Yes | None | Profile RLS unverified | Medium, if profile RLS is broad |
| Photo upload | Yes | Yes | None found | Storage RLS unverified | Medium |
| Discovery/profile viewing | Yes | Yes | Hidden profile/completion gates | `discovery_feed_v3`; RLS unverified | Medium |
| Standard right swipes | Limited/free then wallet charge | Unlimited free standard swipes | `Match.jsx`, `ProfileDrawer.jsx` | `process_swipe_payment` checks premium | Medium because state split can drift |
| Daily like limit | Yes | Unlimited | `checkSwipeLimit` UI | `check_and_reset_swipe_limit` | Medium; split with `profiles.free_swipes` |
| Super Swipe | Requires purchased credit | Requires purchased credit | `superSwipesAvailable` | `send_super_swipe` RPC | Low/Medium, live RPC unverified |
| Premium swipe/request | Wallet purchase | Wallet purchase | SwipeCard/Match | `process_swipe_payment` | Low/Medium |
| Match request accept/decline | Yes | Yes | None | `accept_swipe_request` RPC | Medium, live auth unverified |
| Who liked me/request identity | Blurred for non-priority | Revealed | `Requests.jsx` blur only | Not proven | High |
| Who viewed me | Blurred | Revealed | `Viewers.jsx` blur only | Not proven | High |
| Messaging after match | Yes | Yes | Match selection | Message RLS/match policy | Medium, live RLS unverified |
| Voice notes | Yes | Yes | None found | Storage/message RLS | Medium |
| Image messages | Yes | Yes | None found | Storage/message RLS | Medium |
| Read receipts | Yes | Yes | None found | Message update RLS | Low/Medium |
| Typing/online status | Yes | Yes | None | Realtime presence | Low |
| Advanced filters | UI copy says Premium | Basic gender/university/age shown to all | No premium gate in `Match.jsx` | Query-level filters no premium check | High inconsistency |
| Priority discovery | Claimed Premium | Claimed enabled | No direct user-visible switch | `get_user_visibility_score` adds subscription bonus in SQL | Medium |
| Weekly boost | Claimed Premium | Claimed included | UI copy only | No grant job found | High missing implementation |
| Premium badge | Claimed Premium | Claimed | UI pieces read `is_premium` | Profile field only | Medium |
| Incognito mode | Setting exists | Likely intended premium | No premium gate found | Settings table unverified | Medium |
| Ad removal | Not applicable | Claimed nowhere in code | None | None | Informational |
| Blocking/reporting/safety | Yes | Yes | Not premium | RLS/functions unverified | Low |
| Notifications | Yes | Yes | Notification settings | Edge Functions | Medium |
| Gifts | Wallet funded | Wallet funded | Gift modal balance check | `process_gift_purchase` auth guard | Low/Medium |
| Boost | Wallet/RevenueCat purchase | Wallet/RevenueCat purchase | Premium page | `purchase_boost`/webhook | Medium |
| Referral rewards | Yes | Yes | Referrals page | RPCs/triggers | Medium |
| Admin-granted premium | Not visible | Possible through DB/manual | No UI found | Admin functions do not include premium grant in audited code | Medium operational gap |

## Expiration Behavior

The app checks `premium_expires_at` or `current_period_end` in the shared helper. Expired dates disable premium locally, but a stale `profiles.is_premium = true` with no expiry is treated as active. Backend swipe RPC treats active subscriptions with null `current_period_end` as active. This is useful for manual/lifetime access but dangerous without explicit plan type/audit records.
