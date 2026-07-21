# QA Report

Research and QA date: 2026-07-20

## Local Validation

| Check | Result | Evidence |
| --- | --- | --- |
| Existing SEO audit | Pass | `npm run seo:audit` returned: "SEO audit passed. Canonicals, sitemap, redirects, headers, noindex rules, and structured data basics are aligned." |
| Production build | Pass | `npm run build` completed successfully. Existing warning remains for large `agora-D98zRQcD.js` call-SDK chunk at 1,565.25 kB minified / 435.85 kB gzip. |
| Wave 1 custom validation | Pass | `node scripts/validate-phase5-wave1.mjs` validated 12 Wave 1 pages. |
| Sitemap validation | Pass | `public/sitemap.xml` contains 37 canonical URLs and all 12 Wave 1 URLs. |
| Canonical validation | Pass | All 12 pages have self-referencing production canonicals. |
| Structured data parse checks | Pass | All 12 pages include parseable JSON-LD with `BreadcrumbList`, `FAQPage`, and `ImageObject`; page-specific schemas were also added. |
| Duplicate metadata | Pass | No duplicate titles or meta descriptions across the 12 Wave 1 assets. |
| Content duplication check | Pass | Highest word-set similarity was 0.37 between `/dating-app-in-nigeria` and `/blog/best-dating-apps-nigeria-students`, below the 0.62 review threshold. |
| Internal link validation | Pass | All internal links on the 12 pages resolve to canonical static URLs or known app-shell routes. |
| Private route noindex headers | Pass | `/login`, `/signup`, `/dashboard`, `/chat`, `/profile/*`, `/auth/callback`, and `/admin` remain covered by `X-Robots-Tag: noindex, nofollow`. |
| Dating bio generator valid input | Pass | Valid student-safe input generated 3 editable suggestions. |
| Dating bio generator empty state | Pass | Empty input returns a user-safe error. |
| Dating bio generator prohibited input | Pass | Unsafe/deceptive terms return a blocked-input message. |
| Tool security review | Pass | No external model, no client secrets, no input persistence, and suggestions render with `textContent`. |

## Preview Deployment QA

Preview deploy ID: `6a5eaaefe76a1909b6484745`  
Preview URL: `https://6a5eaaefe76a1909b6484745--collegedate4.netlify.app`

| Check | Result |
| --- | --- |
| 12 Wave 1 URLs | All returned HTTP 200. |
| Canonicals | All canonicals point to the production `https://www.thecollegedate.com/...` URLs. |
| Preview indexability | Preview responses include `X-Robots-Tag: noindex`, which is expected for Netlify deploy previews. |
| `.html` redirects | All 12 `.html` variants returned HTTP 301 to extensionless URLs. |
| Private app routes | All tested private/app routes returned HTTP 200 with `X-Robots-Tag: noindex, nofollow, noindex` on preview. |
| Unknown URL | Returned HTTP 404. |
| Bio generator JS | Returned HTTP 200 with JavaScript content type. |
| Desktop responsive smoke test | Pass. `/campus-dating` at 1280x720 rendered expected H1, 9 panels, 22 links, and no horizontal overflow. |
| Mobile responsive smoke test | Pass. `/tools/dating-bio-generator` at 390x844 rendered expected H1, form, no horizontal overflow, and generated 3 suggestions after input. |

## Production Smoke Crawl

Production deploy ID: `6a5eab9e51bf9606db75902a`  
Production URL: `https://www.thecollegedate.com`

| URL | HTTP | Canonical | Indexability | JSON-LD |
| --- | ---: | --- | --- | --- |
| `/dating-app-for-university-students-nigeria` | 200 | Self canonical | Indexable | Present |
| `/dating-app-in-nigeria` | 200 | Self canonical | Indexable | Present |
| `/campus-dating` | 200 | Self canonical | Indexable | Present |
| `/student-dating` | 200 | Self canonical | Indexable | Present |
| `/safety` | 200 | Self canonical | Indexable | Present |
| `/campus-dating-safety` | 200 | Self canonical | Indexable | Present |
| `/blog/how-to-date-safely-on-campus-nigeria` | 200 | Self canonical | Indexable | Present |
| `/blog/best-dating-apps-nigeria-students` | 200 | Self canonical | Indexable | Present |
| `/dating-bio-examples-students` | 200 | Self canonical | Indexable | Present |
| `/tools/dating-bio-generator` | 200 | Self canonical | Indexable | Present |
| `/conversation-starters-dating-app` | 200 | Self canonical | Indexable | Present |
| `/first-date-ideas-students` | 200 | Self canonical | Indexable | Present |

Additional production checks:

- All 12 `.html` variants return HTTP 301 to extensionless URLs.
- `/sitemap.xml` returns HTTP 200, contains 37 URLs, and contains all Wave 1 URLs.
- `/robots.txt` returns HTTP 200.
- `/tools/dating-bio-generator.js` returns HTTP 200 with `application/javascript; charset=UTF-8`.
- `/login`, `/signup`, `/dashboard`, `/chat`, `/profile/test-id`, `/auth/callback`, and `/admin` return `X-Robots-Tag: noindex, nofollow`.
- `/definitely-not-a-real-phase5-url` returns HTTP 404 and the 404 body contains `<meta name="robots" content="noindex, nofollow">`.

## Limitations

- Full Lighthouse/Core Web Vitals collection was not run in this phase. The static SEO pages are lightweight, but the existing app bundle still has a known large Agora call-SDK chunk.
- Google Rich Results Test and Search Console indexing requests require external/manual access.
