# Phase 7 Performance Baseline

Research date: 2026-07-21. Baseline was captured against live production before Phase 7 changes, using Lighthouse 12.8.2 with three runs per page on mobile and desktop. Authenticated dashboard, chat, and call flows were not measured because no safe test account/session was available.

## Homepage Median Baseline

| Viewport | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS | Transfer | Requests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile | 68 | 94 | 79 | 100 | 4.34s | 5.73s | 41ms | 0.000 | 1333KB | 21 |
| Desktop | 78 | 94 | 78 | 100 | 1.50s | 2.10s | 0ms | 0.000 | 1333KB | 21 |

## Baseline Findings

- Homepage mobile LCP was the major issue at 5.73s with the LCP element being above-the-fold hero copy, not an image.
- Homepage transfer weight was 1333KB, driven by large remote/profile imagery, JavaScript, Google Fonts, and third-party/static media requests.
- Static SEO pages were already strong, generally scoring 100 performance and SEO with subsecond LCP.
- Login/signup were intentionally private/search-suppressed and should not be treated as SEO landing pages.

Raw evidence lives in docs/seo-phase-7/lighthouse-baseline/ and summary data lives in docs/seo-phase-7/lighthouse-baseline-summary.json.
