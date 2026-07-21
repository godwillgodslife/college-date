# Bundle Analysis

Build date: 2026-07-21. Production build completed successfully. The Vite large-chunk warning remains because Agora is intentionally isolated into a large call-only chunk.

## Top Built Assets

| Asset | Raw | Gzip | Type |
| --- | ---: | ---: | --- |
| agora-D7Ps--8q.js | 1529KB | 426KB | js |
| react-vendor-D7XHeoGm.js | 278KB | 90KB | js |
| index-BDD1GHFC.js | 167KB | 57KB | js |
| supabase-BZ0N5lZN.js | 167KB | 44KB | js |
| AdminDashboard-BH7QlRq9.js | 152KB | 34KB | js |
| framer-motion-BQleWtv9.js | 124KB | 41KB | js |
| WireframeShowcase-6dSv7qcU.css | 85KB | 15KB | css |
| WireframeShowcase-BWJ1wIUg.js | 79KB | 17KB | js |
| landing-profile-amaka-DVMq9faz.webp | 79KB | 79KB | webp |
| AdminDashboard-BLdsgWy1.css | 59KB | 10KB | css |
| Chat-C3O3Uaod.js | 43KB | 14KB | js |
| Chat-BGx1IiHK.css | 36KB | 7KB | css |

## Findings

- Initial public HTML modulepreloads now include only core app, React vendor, and Supabase chunks; framer-motion and agora are not modulepreloaded on the homepage.
- Landing-DANiw-GD.js is about 14KB raw and 5KB gzip.
- The largest bundle is still agora-D7Ps--8q.js at about 1.5MB raw and 436KB gzip, but it is route-isolated and not part of homepage startup.
- react-vendor and the main app chunk remain the next largest unavoidable startup assets for the client-rendered app.

## Recommendations

- Keep Agora isolated and do not preload it outside call routes.
- Consider a future public-site/static-shell split so SEO pages and the homepage do not boot Supabase/auth unless needed.
- Consider route-level CSS ownership cleanup for authenticated pages after the SEO content program stabilizes.
