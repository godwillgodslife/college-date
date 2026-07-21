# Verified Product Facts

Research date: 2026-07-20

## Verified and safe to publish

- The College Date is positioned publicly as a campus dating and student social discovery app for Nigerian university, polytechnic, and college students aged 18 and above.
- The public download page lists Android and web access, with Android package `com.collegedate.app` and Google Play URL `https://play.google.com/store/apps/details?id=com.collegedate.app`.
- Signup supports email/password and Google login.
- Onboarding requires age and blocks completion below 18 in `src/pages/MiniProfileSetup.jsx`.
- Onboarding asks for name, age, institution, level, interests, dating intention, and at least one photo.
- Institution options include Nigerian universities, polytechnics, and colleges.
- Dating intention options include Casual, Serious, and Friends.
- Profiles can include photos, bio, university, faculty, department, level, interests, anthem, location status, voice intro, MBTI, genotype, and attraction goal.
- Discovery can use gender filters, age range, university filter, live mode, profile completion signals, mutual matching, and private chat after match/context.
- Settings include notification controls, message previews, show online status, and incognito mode.
- Public support options include `info@thecollegedate.com`, safety email `godwillgodslife@gmail.com`, and WhatsApp support from the support page.
- Public pages include Privacy, Terms, Delete Account, Safety, Child Safety Standards, FAQ, and Support.
- AI profile trust checks exist in app code, but should be described cautiously as a trust-support feature.

## Partially verified and must be cautiously worded

- Reporting tools are referenced in public policy pages and admin moderation exists for confession reports. User/profile-level reporting should be worded as "available in-app tools where present or contact support" unless owner confirms all surfaces.
- Verification exists as AI profile review and an `is_verified` field, but public copy must not imply universal identity or student verification.
- Location is used as profile `location_status` and live/near-me flow can request geolocation while falling back to university proximity. Do not claim precise location matching as the core product.
- Matching prioritizes gender preference and same-university signals, but it is not strictly limited to one school.

## Unverified and prohibited from publication

- Universal identity verification.
- Background checks.
- Guaranteed student verification.
- Continuous human monitoring of all users or messages.
- Guaranteed safety.
- University endorsement, partnerships, campus approval, user counts, awards, reviews, ratings, or success statistics.
- iOS App Store availability. Public repository docs confirm Android and web; an Instagram snippet suggested iOS but was not used because it is not verified in local/public app facts.

## Owner confirmation required

- Whether every reportable user surface has an active report/block control.
- Whether manual human review is performed for all AI-flagged profiles.
- Whether any university partnerships, ambassadors, or official campus groups exist.
- Whether an iOS app is publicly available and what the official App Store URL is.
- Exact public moderation SLA and account enforcement workflow.
