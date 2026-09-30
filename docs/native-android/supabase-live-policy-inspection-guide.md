# Supabase Live Policy Inspection Guide

Date: 2026-08-01

Purpose: capture the exact live policy, grant, view, and function metadata needed to review the proposed profile RLS remediation.

The SQL script is read-only. It reads PostgreSQL catalogue and `information_schema` metadata only. It does not select from `public.profiles`, `discovery_feed_v3`, `leaderboard_unified`, `optimized_confessions`, or any user-record table.

## Steps

1. Open [Supabase Dashboard](https://supabase.com/dashboard).
2. Select the College Date project, project ref `gedoyoleoscgxgdqszzc`.
3. In the left navigation, open **SQL Editor**.
4. Click **New query**.
5. Open [profile-rls-live-inspection.sql](C:/college-date/docs/native-android/profile-rls-live-inspection.sql).
6. Paste the whole SQL script into the Supabase SQL Editor.
7. Confirm the first line after comments is `begin transaction read only;`.
8. Run the query.
9. Export or copy every result set. Supabase may show multiple result tabs; capture all of them.
10. Return only the policy/grant/view/function metadata output for analysis.

## What Not To Share

Do not share:

- Supabase service-role keys.
- Database passwords.
- JWT secrets.
- OAuth client secrets.
- Real profile rows or screenshots containing user personal data.
- Query outputs from `select * from public.profiles`.
- Payment provider secrets.

## Safe Output To Return

It is safe to return the output from the inspection script because it contains:

- RLS status flags.
- Policy names and expressions.
- Grants.
- View definitions.
- Function names, owners, security mode, search-path config, and execute grants.
- PostgREST/Data API role settings.

## Optional Cross-Check In Dashboard UI

After running the SQL:

1. Open **Database**.
2. Open **Policies**.
3. Select `public.profiles`.
4. Confirm whether RLS is enabled.
5. Do not open or export table rows.
6. Compare the visible policy list against the SQL output.

## Expected Next Step

After the metadata output is returned, review whether the proposed migration must be adjusted to drop or replace exact live policy names before staging application.
