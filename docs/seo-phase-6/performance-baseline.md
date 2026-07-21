# Performance Baseline

Research date: 2026-07-21

Baseline ran against live production before Phase 6 deployment using Lighthouse 12.8.2, mobile emulation, headless Chrome, and the standard categories. INP is field-only and was not available in Lighthouse lab output, so Total Blocking Time is recorded as the lab interaction proxy.

| Page | Perf | A11y | Best Practices | SEO | FCP | LCP | INP | TBT | CLS | Speed Index | KB transferred | JS KB | CSS KB | Image KB | Requests |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| best-dating-apps | 100 | 100 | 96 | 100 | 1.0 s | 1.0 s | N/A lab | 0 ms | 0 | 1.8 s | 6 | 0 | 1 | 0 | 3 |
| blog | 100 | 100 | 96 | 100 | 1.0 s | 1.0 s | N/A lab | 10 ms | 0 | 1.7 s | 5 | 0 | 1 | 0 | 3 |
| campus-dating | 100 | 100 | 96 | 100 | 0.9 s | 0.9 s | N/A lab | 0 ms | 0 | 1.7 s | 6 | 0 | 1 | 0 | 3 |
| dating-app-in-nigeria | 100 | 100 | 96 | 100 | 1.0 s | 1.0 s | N/A lab | 0 ms | 0 | 2.0 s | 6 | 0 | 1 | 0 | 3 |
| dating-bio-generator | 100 | 100 | 96 | 100 | 1.2 s | 1.2 s | N/A lab | 0 ms | 0 | 1.9 s | 8 | 2 | 1 | 0 | 4 |
| home | 60 | 94 | 75 | 100 | 4.4 s | 7.5 s | N/A lab | 200 ms | 0.004 | 5.5 s | 1517 | 369 | 64 | 684 | 79 |
| safety | 100 | 100 | 96 | 100 | 0.9 s | 0.9 s | N/A lab | 0 ms | 0 | 1.7 s | 6 | 0 | 1 | 0 | 3 |

## Baseline Findings

- Static SEO pages were already separated from authenticated app bundles: 0 KB app JavaScript on static guide pages, and only 2 KB JavaScript on the dating bio generator.
- Homepage was the performance outlier: 79 requests, 369 KB JavaScript transferred, 684 KB image transfer, 7.5s LCP, and performance score 60.
- The large Agora call SDK chunk remained present in the app build, but it was not requested by static SEO pages.
