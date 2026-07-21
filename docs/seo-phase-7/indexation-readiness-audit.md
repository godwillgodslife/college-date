# Indexation Readiness Audit

Audit date: 2026-07-21. Production base: https://www.thecollegedate.com.

## Public Wave 1+2 Status

| URL | HTTP | Indexability | Canonical |
| --- | ---: | --- | --- |
| / | 200 | indexable | https://www.thecollegedate.com/ |
| /download | 200 | indexable | https://www.thecollegedate.com/download |
| /dating-app-for-university-students-nigeria | 200 | indexable | https://www.thecollegedate.com/dating-app-for-university-students-nigeria |
| /dating-app-in-nigeria | 200 | indexable | https://www.thecollegedate.com/dating-app-in-nigeria |
| /campus-dating | 200 | indexable | https://www.thecollegedate.com/campus-dating |
| /student-dating | 200 | indexable | https://www.thecollegedate.com/student-dating |
| /safety | 200 | indexable | https://www.thecollegedate.com/safety |
| /campus-dating-safety | 200 | indexable | https://www.thecollegedate.com/campus-dating-safety |
| /blog/how-to-date-safely-on-campus-nigeria | 200 | indexable | https://www.thecollegedate.com/blog/how-to-date-safely-on-campus-nigeria |
| /blog/best-dating-apps-nigeria-students | 200 | indexable | https://www.thecollegedate.com/blog/best-dating-apps-nigeria-students |
| /dating-bio-examples-students | 200 | indexable | https://www.thecollegedate.com/dating-bio-examples-students |
| /tools/dating-bio-generator | 200 | indexable | https://www.thecollegedate.com/tools/dating-bio-generator |
| /conversation-starters-dating-app | 200 | indexable | https://www.thecollegedate.com/conversation-starters-dating-app |
| /first-date-ideas-students | 200 | indexable | https://www.thecollegedate.com/first-date-ideas-students |
| /safe-dating-app-nigeria | 200 | indexable | https://www.thecollegedate.com/safe-dating-app-nigeria |
| /dating-app-for-students | 200 | indexable | https://www.thecollegedate.com/dating-app-for-students |
| /online-dating-app-for-undergraduates | 200 | indexable | https://www.thecollegedate.com/online-dating-app-for-undergraduates |
| /how-to-meet-people-on-campus | 200 | indexable | https://www.thecollegedate.com/how-to-meet-people-on-campus |
| /dating-as-a-fresher-nigeria | 200 | indexable | https://www.thecollegedate.com/dating-as-a-fresher-nigeria |
| /dating-profile-picture-tips-students | 200 | indexable | https://www.thecollegedate.com/dating-profile-picture-tips-students |
| /first-message-examples-dating-apps | 200 | indexable | https://www.thecollegedate.com/first-message-examples-dating-apps |
| /romance-scams-nigerian-students | 200 | indexable | https://www.thecollegedate.com/romance-scams-nigerian-students |
| /what-not-to-share-on-dating-apps | 200 | indexable | https://www.thecollegedate.com/what-not-to-share-on-dating-apps |
| /campus-date-ideas-students | 200 | indexable | https://www.thecollegedate.com/campus-date-ideas-students |
| /relationship-boundaries-for-students | 200 | indexable | https://www.thecollegedate.com/relationship-boundaries-for-students |
| /green-flags-student-relationships | 200 | indexable | https://www.thecollegedate.com/green-flags-student-relationships |

## Private Route Status

| URL | HTTP | Indexability | Directive |
| --- | ---: | --- | --- |
| /login | 200 | noindex | noindex, nofollow |
| /signup | 200 | noindex | noindex, nofollow |
| /dashboard | 200 | noindex | noindex, nofollow |
| /chat | 200 | noindex | noindex, nofollow |
| /auth/callback | 200 | noindex | noindex, nofollow |
| /admin | 200 | noindex | noindex, nofollow |

## Resource Status

| URL | HTTP | Content Type |
| --- | ---: | --- |
| /manifest.webmanifest | 200 | application/octet-stream |
| /favicon-64.png | 200 | image/png |
| /logo-192.png | 200 | image/png |
| /logo-512.png | 200 | image/png |
| /llms.txt | 200 | text/plain; charset=utf-8 |
| /robots.txt | 200 | text/plain; charset=utf-8 |
| /sitemap.xml | 200 | application/xml; charset=utf-8 |
| /sw-pwa.js | 200 | application/javascript; charset=UTF-8 |

## Redirect and 404 Checks

- /campus-dating.html returns 301 to /campus-dating.
- /dating-app-in-nigeria.html returns 301 to /dating-app-in-nigeria.
- Random unknown URL returns HTTP 404 and canonicalizes to /404.

## Sitemap

The production build regenerated sitemap.xml with 46 canonical URL entries. Wave 1 and Wave 2 public URLs are present with canonical extensionless URLs.
