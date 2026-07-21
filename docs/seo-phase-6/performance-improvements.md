# Performance Improvements

Research date: 2026-07-21

## Implemented Low-Risk Changes

- Limited authenticated route-chunk preloading to authenticated users in `src/App.jsx`.
- Replaced the global canvas-confetti CDN script with an on-demand dynamic import in `src/components/MatchCelebration.jsx`.
- Removed the global confetti CDN script from `index.html`.
- Moved the OneSignal web SDK load from global `index.html` bootstrapping into authenticated web push setup in `src/services/pushNotification.js`.
- Updated landing-page public links to extensionless canonical URLs in `src/pages/Landing.jsx`.

## Production After Measurements

| Page | Perf | A11y | Best Practices | SEO | FCP | LCP | INP | TBT | CLS | Speed Index | KB transferred | JS KB | CSS KB | Image KB | Requests |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| best-dating-apps | 100 | 100 | 96 | 100 | 1.2 s | 1.2 s | N/A lab | 10 ms | 0 | 2.8 s | 6 | 0 | 1 | 0 | 3 |
| blog | 100 | 100 | 96 | 100 | 0.9 s | 0.9 s | N/A lab | 0 ms | 0 | 1.8 s | 6 | 0 | 1 | 0 | 3 |
| campus-dating | 100 | 100 | 96 | 100 | 0.9 s | 0.9 s | N/A lab | 0 ms | 0 | 1.8 s | 6 | 0 | 1 | 0 | 3 |
| dating-app-in-nigeria | 100 | 100 | 96 | 100 | 1.1 s | 1.1 s | N/A lab | 10 ms | 0 | 2.4 s | 6 | 0 | 1 | 0 | 3 |
| dating-bio-generator | 100 | 100 | 96 | 100 | 1.0 s | 1.0 s | N/A lab | 0 ms | 0 | 2.4 s | 8 | 2 | 1 | 0 | 4 |
| home | 59 | 94 | 79 | 100 | 4.2 s | 7.6 s | N/A lab | 180 ms | 0 | 6.4 s | 1333 | 233 | 16 | 685 | 21 |
| safety | 100 | 100 | 96 | 100 | 0.9 s | 0.9 s | N/A lab | 10 ms | 0 | 1.7 s | 6 | 0 | 1 | 0 | 3 |

## Before vs After Summary

| Page | Perf before | Perf after | JS KB before | JS KB after | Requests before | Requests after | LCP before | LCP after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| best-dating-apps | 100 | 100 | 0 | 0 | 3 | 3 | 1.0 s | 1.2 s |
| blog | 100 | 100 | 0 | 0 | 3 | 3 | 1.0 s | 0.9 s |
| campus-dating | 100 | 100 | 0 | 0 | 3 | 3 | 0.9 s | 0.9 s |
| dating-app-in-nigeria | 100 | 100 | 0 | 0 | 3 | 3 | 1.0 s | 1.1 s |
| dating-bio-generator | 100 | 100 | 2 | 2 | 4 | 4 | 1.2 s | 1.0 s |
| home | 60 | 59 | 369 | 233 | 79 | 21 | 7.5 s | 7.6 s |
| safety | 100 | 100 | 0 | 0 | 3 | 3 | 0.9 s | 0.9 s |

## Interpretation

- Static SEO pages remain excellent: performance 100 on production for the tested static pages, accessibility 100, SEO 100, and no app-only JavaScript.
- Homepage requests dropped from 79 to 21 and JavaScript transfer dropped from 369 KB to 233 KB. CSS transfer dropped from 64 KB to 16 KB.
- Homepage Lighthouse performance stayed effectively flat, 60 to 59, because LCP remains dominated by homepage media/render timing. That should be a Phase 7 target.
- Best Practices improved on the homepage from 75 to 79 after removing global third-party scripts from the logged-out path.
- Agora remains a large build chunk but is not requested on static SEO pages; further work should focus on app route chunk strategy and homepage media.
