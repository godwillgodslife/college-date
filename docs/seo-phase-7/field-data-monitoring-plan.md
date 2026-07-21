# Field Data Monitoring Plan

Created: 2026-07-21.

## Metrics to Monitor

- Core Web Vitals: LCP, INP, CLS.
- Navigation-level route performance for /, /login, /signup, /dashboard, /match, /chat, and /call/*.
- Resource weight for homepage JS, fonts, and images.
- Android WebView startup timing after app releases.

## Tools

- Google Search Console Core Web Vitals report after deployment and recrawl.
- CrUX URL-level field data when enough traffic is available.
- GA4/Web Vitals custom events if analytics is added.
- Existing app performanceMonitor hooks for route transitions.
- Netlify deploy analytics/logs for cache and response behavior.

## Cadence

- Check Search Console 7 days after deployment, then weekly for four weeks.
- Re-run Lighthouse on homepage and key conversion routes before each major content or app release.
- Treat mobile LCP over 2.5s at the 75th percentile as the next performance initiative.
