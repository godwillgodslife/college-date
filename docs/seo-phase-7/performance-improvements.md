# Performance Improvements

Implementation date: 2026-07-21. No UI redesign was performed.

## Changes Made

- Replaced heavyweight homepage/public brand images with optimized local WebP/PNG assets.
- Removed remote Pexels CSS background discovery from homepage carousel slides.
- Deferred secondary homepage profile images until idle/timeout while keeping the first visible image immediately available.
- Added explicit image dimensions and lazy/async loading to non-critical homepage media.
- Converted Google Fonts loading to async preload with noscript fallback.
- Replaced oversized /logo.png favicon/manifest references with smaller generated logo assets.
- Reduced service worker precache to durable lightweight app metadata instead of legacy oversized logo files.
- Lazy-loaded AppLayout to keep authenticated shell code out of the initial public homepage modulepreload path.

## Before vs After: Full Matrix Median

The after matrix was captured from local Vite preview to isolate source/build changes from CDN variance.

| Viewport | Perf Before | Perf After | LCP Before | LCP After | Transfer Before | Transfer After | Accessibility | Best Practices | SEO |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile | 68 | 80 | 5.73s | 3.46s | 1333KB | 228KB | 94 -> 100 | 79 -> 100 | 100 -> 100 |
| Desktop | 78 | 94 | 2.10s | 1.22s | 1333KB | 206KB | 94 -> 100 | 78 -> 100 | 100 -> 100 |

## Production Spot Check

| Viewport | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS | Transfer | Requests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile | 77 | 100 | 100 | 100 | 2.41s | 4.25s | 184ms | 0.006 | 420KB | 20 |
| Desktop | 78 | 100 | 100 | 100 | 1.90s | 1.90s | 0ms | 0.000 | 420KB | 20 |

## Remaining Risk

Mobile LCP is improved but not consistently under 2.5s on the live production spot check. The next performance project should isolate the public homepage from auth/session boot or provide a static/SSR shell for the first viewport.
