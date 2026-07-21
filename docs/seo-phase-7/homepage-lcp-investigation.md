# Homepage LCP Investigation

Research date: 2026-07-21. The homepage LCP element was text in both mobile and desktop tests, so the improvement strategy focused on render path, JavaScript pressure, font loading, and media discovery rather than preloading a hero image.

## LCP Element

| Viewport | LCP Element | Baseline Median LCP | Production Spot LCP | Main Delay |
| --- | --- | ---: | ---: | --- |
| Mobile | Hero supporting paragraph: ?The College Date is built for the confidence, culture, and everyday rhythm...? | 5.73s | 4.25s | Render delay remained dominant at about 86% in the production spot check. |
| Desktop | Hero H1: ?Real connections. Real you.? | 2.10s | 1.90s | Render delay and JavaScript hydration. |

## Diagnosis

- The homepage was not blocked by an oversized LCP image; large imagery still increased network contention and memory pressure.
- CSS-discovered carousel background images caused hidden/secondary images to be discovered too early.
- Google Fonts were loaded as a normal render-priority stylesheet.
- The public landing route still pays part of the React/auth boot cost; this is the remaining LCP risk.

## Decision

Phase 7 used low-risk improvements: self-hosted optimized WebP images, deferred secondary image loading, async font stylesheet loading, smaller favicons/logos, and app-shell code isolation. A deeper public-home pre-render/auth boot split was deferred because it has higher signed-in redirect regression risk.
