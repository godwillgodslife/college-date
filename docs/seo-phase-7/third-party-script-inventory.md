# Third-Party Script Inventory

Review date: 2026-07-21.

## Public Homepage and SEO Pages

| Provider | Purpose | Load Behavior | Phase 7 Status |
| --- | --- | --- | --- |
| Google Fonts | Typography | Async preload with noscript fallback | Retained, lower render-blocking risk |
| Supabase JS | Auth/session and app data | Still in app startup bundle | Retained; future public-shell split recommended |
| Google Play | External app download link | Link only | No script load |
| Instagram | Social link | Link only | No script load |
| Pexels | Former homepage remote profile images | Removed from homepage critical path | Replaced with local optimized WebP |

## Authenticated or Interaction-Only

| Provider | Purpose | Load Behavior | Notes |
| --- | --- | --- | --- |
| OneSignal | Push notifications | Authenticated/native push initialization only | No public homepage SDK boot detected |
| Paystack | Web payments | Payment flow only | CSP allowlist retained |
| Agora | Calls | Dynamic call-route import | Isolated from homepage |
| RevenueCat | Android subscriptions | Native Capacitor path | Not a web homepage script |
| OpenRouter | AI services | Server-side Supabase Edge Functions | No client-side key exposure |

## Recommendation

The next major opportunity is not a third-party tag cleanup; it is reducing public homepage dependency on client auth/app bootstrap.
