# Deployment Report

Deployment date: 2026-07-20

## Build Artifact

- Build command: `npm run build`
- Output directory: `dist`
- Result: Success
- Sitemap generated during build: 37 canonical URLs
- Build warning: existing large `agora-D98zRQcD.js` chunk remains. This is tied to the call SDK and was not introduced by Wave 1 static SEO content.

## Preview Deployment

- Command: `netlify deploy --dir=dist --message "Phase 5 Wave 1 SEO content preview" --json`
- Site: `collegedate4`
- Site ID: `7ef7a935-0517-405d-b468-48e199caeb65`
- Deploy ID: `6a5eaaefe76a1909b6484745`
- Preview URL: `https://6a5eaaefe76a1909b6484745--collegedate4.netlify.app`
- Logs: `https://app.netlify.com/projects/collegedate4/deploys/6a5eaaefe76a1909b6484745`
- QA result: Passed preview crawl, redirect checks, noindex checks, 404 check, and responsive/tool smoke test.

## Production Deployment

- Command: `netlify deploy --prod --dir=dist --message "Phase 5 Wave 1 SEO content" --json`
- Site: `collegedate4`
- Site ID: `7ef7a935-0517-405d-b468-48e199caeb65`
- Production deploy ID: `6a5eab9e51bf9606db75902a`
- Production URL: `https://www.thecollegedate.com`
- Deploy URL: `https://6a5eab9e51bf9606db75902a--collegedate4.netlify.app`
- Logs: `https://app.netlify.com/projects/collegedate4/deploys/6a5eab9e51bf9606db75902a`
- QA result: Passed live smoke crawl.

## Live Production Results

| URL | Status | Canonical | Indexability |
| --- | ---: | --- | --- |
| `https://www.thecollegedate.com/dating-app-for-university-students-nigeria` | 200 | Self canonical | Indexable |
| `https://www.thecollegedate.com/dating-app-in-nigeria` | 200 | Self canonical | Indexable |
| `https://www.thecollegedate.com/campus-dating` | 200 | Self canonical | Indexable |
| `https://www.thecollegedate.com/student-dating` | 200 | Self canonical | Indexable |
| `https://www.thecollegedate.com/safety` | 200 | Self canonical | Indexable |
| `https://www.thecollegedate.com/campus-dating-safety` | 200 | Self canonical | Indexable |
| `https://www.thecollegedate.com/blog/how-to-date-safely-on-campus-nigeria` | 200 | Self canonical | Indexable |
| `https://www.thecollegedate.com/blog/best-dating-apps-nigeria-students` | 200 | Self canonical | Indexable |
| `https://www.thecollegedate.com/dating-bio-examples-students` | 200 | Self canonical | Indexable |
| `https://www.thecollegedate.com/tools/dating-bio-generator` | 200 | Self canonical | Indexable |
| `https://www.thecollegedate.com/conversation-starters-dating-app` | 200 | Self canonical | Indexable |
| `https://www.thecollegedate.com/first-date-ideas-students` | 200 | Self canonical | Indexable |

## Search Console Actions Still Requiring Manual Access

- Inspect and request indexing for the 12 Wave 1 URLs.
- Resubmit `https://www.thecollegedate.com/sitemap.xml`.
- Monitor Coverage/Pages report for crawled but not indexed, duplicate without user-selected canonical, and soft 404 signals.
- Monitor Performance report for query separation between commercial, campus, safety, profile, conversation, and date-idea intents.
- Validate rich-result eligibility externally for Article/FAQ/Breadcrumb/WebApplication pages.
