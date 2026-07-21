# Netlify Production Deployment

Date: 2026-07-21

Status: Blocked

## Site Verification

Confirmed linked Netlify site:

- Project: `collegedate4`
- Project ID: `7ef7a935-0517-405d-b468-48e199caeb65`
- Admin URL: `https://app.netlify.com/projects/collegedate4`
- Production URL: `https://www.thecollegedate.com`

Live status before rollout:

- `https://www.thecollegedate.com`: HTTP 200
- `https://www.thecollegedate.com/payment/callback`: HTTP 404 before deploying the remediation frontend

## Deployment

Not started.

Reason:

- Frontend depends on new database RPCs and Edge Functions.
- Migration, secrets, webhooks, and RLS verification did not pass.

## Rollback

When deployment resumes:

1. Record the current production deploy ID immediately before `netlify deploy --prod`.
2. Deploy only after all backend gates pass.
3. If a rollback trigger fires, restore the previous deploy from the Netlify dashboard for `collegedate4`.
4. If needed, temporarily disable payment initialization by removing/rotating the production `PAYSTACK_SECRET_KEY` from Supabase Edge Function secrets while preserving all evidence tables.

## Deploy ID

Not started.
