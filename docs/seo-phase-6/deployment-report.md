# Deployment Report

Deployment date: 2026-07-21

## Build

- Command: `npm run build`
- Result: Success
- Sitemap URLs: 46 canonical URLs
- Build warning: existing large Agora call-SDK chunk remains, not introduced by Wave 2 static content.

## Preview Deployment

- Command: `netlify deploy --dir=dist --message "Phase 6 Wave 2 SEO content preview final" --json`
- Site: `collegedate4`
- Site ID: `7ef7a935-0517-405d-b468-48e199caeb65`
- Deploy ID: `6a5eb5ce247ce13193314814`
- Preview URL: https://6a5eb5ce247ce13193314814--collegedate4.netlify.app
- Logs: https://app.netlify.com/projects/collegedate4/deploys/6a5eb5ce247ce13193314814
- QA result: Passed preview crawl, mobile smoke test, private noindex checks, redirect checks, 404 check, and bio generator regression test.

## Production Deployment

- Command: `netlify deploy --prod --dir=dist --message "Phase 6 Wave 2 SEO content" --json`
- Production deploy ID: `6a5eb73db6f351f3c9133015`
- Production URL: https://www.thecollegedate.com
- Deploy URL: https://6a5eb73db6f351f3c9133015--collegedate4.netlify.app
- Logs: https://app.netlify.com/projects/collegedate4/deploys/6a5eb73db6f351f3c9133015
- QA result: Passed live smoke crawl.

## Live Wave 2 URL Results

| URL | Status | Canonical | Indexability |
| --- | ---: | --- | --- |
| https://www.thecollegedate.com/safe-dating-app-nigeria | 200 | Self canonical | Indexable |
| https://www.thecollegedate.com/dating-app-for-students | 200 | Self canonical | Indexable |
| https://www.thecollegedate.com/online-dating-app-for-undergraduates | 200 | Self canonical | Indexable |
| https://www.thecollegedate.com/how-to-meet-people-on-campus | 200 | Self canonical | Indexable |
| https://www.thecollegedate.com/dating-as-a-fresher-nigeria | 200 | Self canonical | Indexable |
| https://www.thecollegedate.com/dating-profile-picture-tips-students | 200 | Self canonical | Indexable |
| https://www.thecollegedate.com/first-message-examples-dating-apps | 200 | Self canonical | Indexable |
| https://www.thecollegedate.com/romance-scams-nigerian-students | 200 | Self canonical | Indexable |
| https://www.thecollegedate.com/what-not-to-share-on-dating-apps | 200 | Self canonical | Indexable |
| https://www.thecollegedate.com/campus-date-ideas-students | 200 | Self canonical | Indexable |
| https://www.thecollegedate.com/relationship-boundaries-for-students | 200 | Self canonical | Indexable |
| https://www.thecollegedate.com/green-flags-student-relationships | 200 | Self canonical | Indexable |

All Wave 2 .html variants return HTTP 301 to their extensionless canonical URLs.
