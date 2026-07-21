# Phase 7 Deployment Report

Deployment date: 2026-07-21.

## Preview Deployment

- Deploy ID: 6a5ecaf6b90761408d56c889
- Draft URL: https://6a5ecaf6b90761408d56c889--collegedate4.netlify.app
- Build logs: https://app.netlify.com/projects/collegedate4/deploys/6a5ecaf6b90761408d56c889
- Result: Preview QA passed with expected deploy-preview public noindex warnings.

## Preview Lighthouse Spot Check

| Viewport | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS | Transfer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile | 76 | 100 | 100 | 69 | 3.06s | 4.33s | 110ms | 0.006 | 386KB |
| Desktop | 86 | 100 | 100 | 69 | 1.09s | 1.83s | 1ms | 0.000 | 420KB |

Preview SEO score is lower because Netlify draft deploys emit X-Robots-Tag: noindex for public pages. Production does not.

## Production Deployment

- Production URL: https://www.thecollegedate.com
- Production deploy ID: 6a5ecc7dc589f8a98a2f471b
- Unique deploy URL: https://6a5ecc7dc589f8a98a2f471b--collegedate4.netlify.app
- Build logs: https://app.netlify.com/projects/collegedate4/deploys/6a5ecc7dc589f8a98a2f471b
- Result: Production deploy live and strict live validation passed.

## Production Lighthouse Spot Check

| Viewport | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS | Transfer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile | 77 | 100 | 100 | 100 | 2.41s | 4.25s | 184ms | 0.006 | 420KB |
| Desktop | 78 | 100 | 100 | 100 | 1.90s | 1.90s | 0ms | 0.000 | 420KB |

## Live Smoke Artifact

Saved to docs/seo-phase-7/live-smoke-production.json.
