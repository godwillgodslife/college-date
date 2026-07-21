# QA Report

Research date: 2026-07-21

## Local Validation

| Check | Result | Evidence |
| --- | --- | --- |
| Phase 6 validator | Pass | `node scripts/validate-phase6-wave2.mjs`: validated 12 Wave 2 pages and 9 affected Wave 1 pages; max similarity 0.37. |
| Phase 5 regression validator | Pass | `node scripts/validate-phase5-wave1.mjs`: validated 12 Wave 1 pages; max similarity 0.37. |
| Existing SEO audit | Pass | `npm run seo:audit`: canonicals, sitemap, redirects, headers, noindex rules, and structured data basics aligned. |
| Production build | Pass | `npm run build`: build succeeded; sitemap generated with 46 canonical URLs. Existing large Agora chunk warning remains. |
| Mobile layout | Pass | Preview mobile check at 390x844 found no horizontal overflow on /safe-dating-app-nigeria or /tools/dating-bio-generator. |
| Dating bio generator regression | Pass | Preview generated 3 local suggestions; no error; no horizontal overflow. |

## Preview QA

Preview deploy ID: `6a5eb5ce247ce13193314814`  
Preview URL: https://6a5eb5ce247ce13193314814--collegedate4.netlify.app

- All 12 Wave 2 URLs returned HTTP 200.
- All 12 had production self-canonicals, one H1, OG/Twitter metadata, JSON-LD, BreadcrumbList, and sitemap inclusion.
- All 12 .html variants returned 301 to extensionless URLs.
- Preview noindex headers were present as expected on deploy-preview responses.
- Private routes returned `X-Robots-Tag: noindex, nofollow, noindex` on preview.
- Unknown URL returned HTTP 404 with noindex body.

## Production Smoke Crawl

| URL | HTTP | Canonical | Indexability | Sitemap | JSON-LD |
| --- | ---: | --- | --- | --- | --- |
| /safe-dating-app-nigeria | 200 | https://www.thecollegedate.com/safe-dating-app-nigeria | Indexable | Yes | Present |
| /dating-app-for-students | 200 | https://www.thecollegedate.com/dating-app-for-students | Indexable | Yes | Present |
| /online-dating-app-for-undergraduates | 200 | https://www.thecollegedate.com/online-dating-app-for-undergraduates | Indexable | Yes | Present |
| /how-to-meet-people-on-campus | 200 | https://www.thecollegedate.com/how-to-meet-people-on-campus | Indexable | Yes | Present |
| /dating-as-a-fresher-nigeria | 200 | https://www.thecollegedate.com/dating-as-a-fresher-nigeria | Indexable | Yes | Present |
| /dating-profile-picture-tips-students | 200 | https://www.thecollegedate.com/dating-profile-picture-tips-students | Indexable | Yes | Present |
| /first-message-examples-dating-apps | 200 | https://www.thecollegedate.com/first-message-examples-dating-apps | Indexable | Yes | Present |
| /romance-scams-nigerian-students | 200 | https://www.thecollegedate.com/romance-scams-nigerian-students | Indexable | Yes | Present |
| /what-not-to-share-on-dating-apps | 200 | https://www.thecollegedate.com/what-not-to-share-on-dating-apps | Indexable | Yes | Present |
| /campus-date-ideas-students | 200 | https://www.thecollegedate.com/campus-date-ideas-students | Indexable | Yes | Present |
| /relationship-boundaries-for-students | 200 | https://www.thecollegedate.com/relationship-boundaries-for-students | Indexable | Yes | Present |
| /green-flags-student-relationships | 200 | https://www.thecollegedate.com/green-flags-student-relationships | Indexable | Yes | Present |

Additional production checks passed: affected Wave 1 pages returned 200 and remain indexable, homepage/blog/download/safety returned 200, private routes remain noindex, /sitemap.xml and /robots.txt return 200, and /phase6-not-real-url returns 404 with noindex in the body.
