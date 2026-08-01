# Profile RLS Staging Application Plan

Date: 2026-08-01

Status: staging package prepared and committed candidate ready. Do not apply to production.

Final package hashes:

- Migration: `supabase/migrations/20260801120000_restrict_anonymous_profile_access.sql`
- Migration SHA-256: `BB482DE77DC813162333981A3DA69FC46AAA10BE776391ED4AB0B1849CBEAAD7`
- Rollback: `docs/native-android/profile-rls-emergency-rollback.sql`
- Rollback SHA-256: `46DE6935E6288A52153A7D9A267E848C2FD193F0B02BC60A3A59AA2738433CE9`

## Connected Project Status

Finalization check through the connected Supabase tools found only the production project:

- Project name: `College Date`
- Project ref: `gedoyoleoscgxgdqszzc`
- Organization: `lhxcomfjmkhcikbysuli`
- Classification: production
- Test-data-only status: not test data only; production backend
- Current migration state: production does not contain `20260801120000_restrict_anonymous_profile_access`

No separate staging project could be positively identified. Supabase branch listing did not return a usable staging branch. Therefore the migration was not applied and the staging test matrix was not executed.

## Before Migration

- Capture current policies and grants by running [profile-rls-live-inspection.sql](C:/college-date/docs/native-android/profile-rls-live-inspection.sql) against staging.
- Compare staging metadata against [profile-rls-live-readonly-findings.md](C:/college-date/docs/native-android/profile-rls-live-readonly-findings.md); investigate drift before applying.
- Export migration history from staging with the Supabase Dashboard or CLI.
- Confirm staging project reference and make sure it is not production `gedoyoleoscgxgdqszzc`.
- Confirm backup or rollback capability for staging.
- Record current web environment variables for staging without printing secrets.
- Configure staging web client with staging public URL and anon/publishable key.
- Configure staging native client with staging public URL and anon/publishable key through ignored local config.
- Confirm no service-role key is present in web or Android client config.
- Create or identify approved staging test accounts:
  - Anonymous client, no session.
  - Owner account.
  - Non-owner account.
  - Completed-profile account.
  - Incomplete-profile account.
- Ensure test profiles do not contain real personal data.

## Apply Migration To Staging

- Review [20260801120000_restrict_anonymous_profile_access.sql](C:/college-date/supabase/migrations/20260801120000_restrict_anonymous_profile_access.sql) against the live/staging inspection output.
- Update the migration before applying if exact live policies require named drops or replacements.
- Apply only the reviewed migration to staging.
- Record:
  - Staging project ref.
  - Apply timestamp.
  - Migration filename.
  - Migration SHA-256 hash: `BB482DE77DC813162333981A3DA69FC46AAA10BE776391ED4AB0B1849CBEAAD7`.
  - Rollback SHA-256 hash: `46DE6935E6288A52153A7D9A267E848C2FD193F0B02BC60A3A59AA2738433CE9`.
  - Operator name.
- Run the inspection SQL again after application.
- Confirm no unexpected schema objects were created or dropped.
- Confirm PostgREST schema cache reload completed.

## Security Tests

Run these without printing profile row values:

- Anonymous profile table read: `profiles?select=id&limit=1` must return permission denied or no rows.
- Anonymous private-column read: `profiles?select=id,email,push_token,is_premium&limit=1` must return permission denied or no rows.
- Anonymous discovery view read: `discovery_feed_v3?select=*&limit=1` must return permission denied or no rows unless a public replacement is explicitly approved.
- Anonymous leaderboard view read: `leaderboard_unified?select=*&limit=1` must return permission denied or no rows unless a public replacement is explicitly approved.
- Anonymous confessions view read: `optimized_confessions?select=*&limit=1` must return permission denied or no rows.
- Owner self-profile read must return only the owner's row.
- Owner self-profile update must work for permitted owner-editable fields.
- Owner protected-field update attempt is not fixed by this migration; document the current result and keep column-level update hardening as a follow-up blocker.
- Non-owner direct profile read is intentionally still allowed by the transitional authenticated `SELECT` policy; document the current result and keep safe discovery/matched-profile contracts as a follow-up blocker.
- Non-owner direct profile update must fail or affect zero rows.
- Authenticated safe-discovery query must return only approved discovery fields.
- Blocking/exclusion tests must prove blocked users are excluded from discovery/profile surfaces.
- Confession-author identity exposure test must prove clients cannot infer poster, reactor, or claimer IDs from public or normal authenticated confession feed output.

Use [profile-rls-security-test-matrix.sql](C:/college-date/docs/native-android/profile-rls-security-test-matrix.sql) as the database-side starting point.

## Functional Smoke Tests

Verify the current staging web app:

- Landing page.
- Registration.
- Login.
- Password reset request.
- Reset password deep link/session handling.
- Onboarding.
- Referral validation before signup.
- Referral apply after signup.
- Discovery.
- Swipe left/right.
- Super Swipe, without charging real money.
- Matches.
- Messages.
- Profile viewing.
- Profile editing.
- Leaderboard.
- Confessions.
- Notifications list and settings.
- Premium display.
- Wallet display.

Verify native Phase 1.5 against staging:

- Cold launch.
- No-session routing.
- Login with approved staging account.
- Session restoration.
- Logout.
- Onboarding routing for incomplete profile.
- Main destination routing for completed profile.

## Rollback Criteria

Rollback staging immediately if any of these occur:

- Login or session restoration breaks for a valid staging account.
- Owner profile read/update fails for normal onboarding/profile edit fields.
- Referral validation fails unexpectedly.
- Discovery cannot load for authenticated completed-profile users and no replacement contract is ready.
- Matches or conversations cannot load because nested profile summaries are blocked.
- Confessions break in a way not covered by the planned privacy remediation.
- Any policy unexpectedly allows anonymous private profile reads after migration.
- Any service-role/backend-only payment or notification operation is broken by grants.
- Authenticated discovery, leaderboard, or profile summary routes break because the transitional authenticated profile-read policy is missing or misconfigured.

Rollback should be a forward SQL migration that restores only the minimum required grant or policy. Do not restore broad anonymous `profiles` access unless a specific public feature is proven to require it.

## Staging Exit Criteria

Staging is ready for production review only when:

- Pre- and post-migration inspection outputs are archived.
- Anonymous tests pass.
- Owner/non-owner tests pass.
- Transitional authenticated direct profile-read behavior is documented.
- Web smoke tests pass.
- Native auth smoke tests pass.
- Safe replacement contracts for discovery, leaderboard, confessions, and referral validation are either approved or explicitly deferred with owner sign-off before native Phase 2.
- Rollback SQL has been tested in staging or reviewed as executable.
