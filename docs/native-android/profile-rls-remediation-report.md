# Profile RLS Remediation Report

Date: 2026-08-01

Scope: investigate and propose remediation for anonymous public-client access to `public.profiles` discovered during native Android Phase 1.5. Production metadata was inspected through the connected Supabase MCP using read-only catalogue queries. No production database migration was applied.

## Latest Read-Only Inspection

Refreshed on 2026-08-01 against connected Supabase project `College Date` / `gedoyoleoscgxgdqszzc`:

- No profile rows were selected or printed.
- No production write was executed.
- `public.profiles` RLS status, policies, grants, profile-derived views, function metadata, execution grants, migration history, and Supabase security advisors were inspected directly through the connected Supabase tools.
- The proposed migration `20260801120000_restrict_anonymous_profile_access.sql` is not present in production migration history and has not been applied.
- Connected Supabase project listing exposed only the production project `College Date` / `gedoyoleoscgxgdqszzc`; no separate staging project could be positively identified through the connector during finalization.

## 1. Root Cause

Anonymous REST checks confirmed that a public client can read rows from `public.profiles`. The exposure is broader than the original `id` and `id,is_onboarded` checks: anonymous requests could also select private-looking columns such as `email`, `is_premium`, `premium_expires_at`, `free_swipes`, `onesignal_id`, `push_token`, referral fields, notification settings, AI review fields, moderation flags, and timestamps.

Live production metadata confirms the responsible mechanism:

- `public.profiles` has RLS enabled.
- `public.profiles` is owned by `postgres`; RLS is not forced.
- `anon`, `authenticated`, and `service_role` all have broad table privileges on `public.profiles`.
- A live `SELECT` policy named `Public profiles are viewable by everyone` applies to `public` with `USING (true)`.
- No separate `PUBLIC` table-grant row was returned by `information_schema.role_table_grants`; the `public` RLS policy role is still effective for all request roles.
- Additional `public` policies exist for profile insert/update/delete, gated by `auth.uid() = id`; those do not explain anonymous reads but should be replaced with authenticated-only equivalents for clarity.
- Profile-derived views are also reachable by `anon`.

## 2. Exact Policy, View, Grant or Function Responsible

Confirmed responsible surfaces:

| Surface | Anonymous result | Evidence |
| --- | --- | --- |
| `public.profiles` | HTTP 206 with one row returned for `select=id` | Redacted REST probe and live policy `Public profiles are viewable by everyone` |
| `public.profiles` | HTTP 206 with one row returned for `select=id,is_onboarded` | Redacted REST probe |
| `public.profiles` | HTTP 206 with one row returned for many private-looking individual columns | Redacted REST probe |
| `public.discovery_feed_v3` | HTTP 206 with one row returned for `select=*` | Redacted REST probe and live `anon SELECT` grant |
| `public.leaderboard_unified` | HTTP 206 with one row returned for `select=*` | Redacted REST probe, live `anon SELECT` grant, and `security_invoker=false` |
| `public.optimized_confessions` | HTTP 206 with one row returned for `select=*` | Redacted REST probe and live `anon SELECT` grant |
| `public.leaderboard_big_spenders` | Not REST-probed in this pass | Live `anon SELECT` grant; view references `profiles` and `wallets` |
| `public.leaderboard_campus_stars` | Not REST-probed in this pass | Live `anon SELECT` grant; view references `profiles` |
| `public.leaderboard_most_wanted` | Not REST-probed in this pass | Live `anon SELECT` grant; view references `profiles` and `swipes` |

The exact live policy/grant/view metadata has now been captured through read-only Supabase MCP queries. Run [profile-rls-live-inspection.sql](C:/college-date/docs/native-android/profile-rls-live-inspection.sql) again immediately before any approved staging or production apply to detect drift.

### View Inspection

Direct production view inspection found:

| View | Owner | `security_invoker` | Relevant exposure |
| --- | --- | --- | --- |
| `discovery_feed_v3` | `postgres` | `true` | Selects 51 columns, including `email`, `phone`, notification flags, referral fields, quota fields, presence fields, profile media, and plan/boost summary data from `profiles`, `subscriptions`, and `boosts`. |
| `leaderboard_unified` | `postgres` | `false` | Selects profile display fields plus exact `total_spent` from `wallets` and engagement aggregates from `swipes`, `profile_views`, and `matches`; Supabase security advisor flags it as a security-definer view. |
| `optimized_confessions` | `postgres` | `true` | Selects confession content plus `user_id`, reaction user IDs, and `claimer_ids`; this remains a separate anonymity/privacy concern. |

Supabase documentation states that views bypass RLS by default and that Postgres 15+ views can be made to obey caller RLS with `security_invoker = true`. The proposed migration therefore sets `leaderboard_unified` to `security_invoker=true` and removes anonymous grants from the profile-derived views.

## 3. Whether Anonymous Access Was Intentional

No repository evidence shows a current product requirement for anonymous clients to read dating profiles, discovery cards, leaderboard rows, or confessions. The current routes for Match, Explore, Leaderboard, Confessions, Profile, Wallet, Premium, and Settings are protected by `ProtectedRoute` in `src/App.jsx`.

Conclusion: anonymous access to `profiles` and profile-derived app views appears unintended. Anonymous access to private columns is not acceptable for the native Android migration.

## 4. Data Exposed by the Old Contract

No profile values were printed. A shape-only check showed the anonymous API could request these `profiles` column names:

`age`, `ai_photo_origin`, `ai_review_flags`, `ai_review_summary`, `ai_reviewed_at`, `ai_verification_score`, `ai_verification_status`, `anthem`, `attraction_goal`, `avatar_url`, `bio`, `call_minutes_today`, `coins`, `completion_score`, `confession_notifications`, `created_at`, `current_badge`, `department`, `email`, `email_notifications`, `faculty`, `free_swipes`, `free_swipes_remaining`, `full_name`, `gender`, `genotype`, `id`, `incognito_mode`, `interest_gender`, `interests`, `intro_prompt`, `is_banned`, `is_blocked`, `is_live`, `is_onboarded`, `is_online`, `is_optimised`, `is_premium`, `is_shadow_banned`, `is_verified`, `last_active`, `last_call_reset_at`, `last_seen`, `last_seen_at`, `level`, `location_status`, `marketing_notifications`, `match_notifications`, `mbti`, `message_notifications`, `message_previews_enabled`, `onesignal_id`, `phone`, `photo_updated_at`, `photos`, `premium_expires_at`, `profile_activity_notifications`, `profile_photos`, `push_notifications`, `push_token`, `quiet_hours_enabled`, `quiet_hours_end`, `quiet_hours_start`, `referral_code`, `referred_by`, `request_notifications`, `role`, `show_online_status`, `social_notifications`, `sound_enabled`, `status_text`, `status_updated_at`, `streak_freeze_count`, `university`, `updated_at`, `username`, `vibration_enabled`, `view_notifications`, `voice_intro_url`.

## 5. Risk Classification

Risk: High.

Reasons:

- Anonymous clients can read private account/profile fields.
- Push identifiers and notification preferences are exposed.
- Premium, wallet/quota, referral, moderation, and AI-review fields are exposed.
- Discovery and leaderboard views are anonymous-readable.
- `discovery_feed_v3` exposes private profile columns including email, phone, push/notification fields, referral fields, quotas, and status/presence internals to any caller that can read the view.
- `leaderboard_unified` is currently not `security_invoker`, so the Supabase advisor reports it as a security-definer view risk.
- Confessions view exposure remains a separate privacy blocker because it includes poster/reaction/claimer identifiers in repository evidence.

## 6. Existing Application Compatibility Impact

The proposed migration revokes anonymous access only. It should preserve current authenticated web behavior because protected app routes still run with authenticated Supabase sessions.

Expected safe:

- Landing page: no direct profile query found.
- Login/signup/password reset: no direct profile table read required before auth, except referral validation RPC.
- Referral validation: expected to keep working because it uses `validate_referral_code(text)` rather than direct anon table reads.
- Auth hydration/onboarding/profile editing: authenticated owner access preserved.
- Discovery/leaderboard/confessions: authenticated view access preserved.

Future stricter owner-only authenticated `profiles` access will require web query updates. See `docs/native-android/profile-rls-compatibility-impact.md`.

## 7. Recommended Remediation

Apply a staged fix:

1. First, remove anonymous direct access to `profiles` and anonymous access to profile-derived app views.
2. Replace broad `public` profile policies with authenticated-only transitional policies so anonymous clients are blocked while current authenticated web behavior is preserved.
3. Verify anonymous REST now returns no profile rows.
4. Set `leaderboard_unified` to `security_invoker=true`.
5. In a follow-up, replace broad authenticated discovery/profile reads with a safe RPC or limited view.
6. Then remove any authenticated broad direct `profiles` policies that allow non-owner private-column reads.

## 8. Migration Created

Created but not applied:

- `supabase/migrations/20260801120000_restrict_anonymous_profile_access.sql`
- SHA-256: `BB482DE77DC813162333981A3DA69FC46AAA10BE776391ED4AB0B1849CBEAAD7`

This migration hash is final and authoritative for the first-stage remediation package.

The migration:

- Enables RLS on `public.profiles`.
- Revokes all `public.profiles` privileges from `anon` and `PUBLIC`.
- Grants `select`, `insert`, `update`, and `delete` on `public.profiles` to `authenticated`.
- Drops live broad `public` profile policies:
  - `Public profiles are viewable by everyone`
  - `Users can insert their own profile`
  - `Users can update their own profile`
  - `Users can delete own profile`
- Adds a transitional authenticated-only broad `SELECT` policy to avoid breaking current authenticated web discovery/profile screens before safe replacement contracts are shipped.
- Recreates owner insert/update/select policies used for onboarding.
- Adds an authenticated owner delete policy for account deletion.
- Revokes anonymous access from `discovery_feed_v3`, `leaderboard_unified`, `optimized_confessions`, `leaderboard_big_spenders`, `leaderboard_campus_stars`, and `leaderboard_most_wanted` if present.
- Preserves authenticated `select` on those views.
- Sets `leaderboard_unified` to `security_invoker=true`.
- Reloads the PostgREST schema cache.

SQL objects changed by the migration:

- Table RLS/grants/comment: `public.profiles`
- Policies dropped: `Public profiles are viewable by everyone`, `Users can insert their own profile`, `Users can update their own profile`, `Users can delete own profile`
- Policies recreated or added: `Authenticated users can read profiles for current app screens`, `Users can insert own profile during onboarding`, `Users can update own profile during onboarding`, `Users can read own profile during onboarding`, `Users can delete own profile after account deletion request`
- View grants: `public.discovery_feed_v3`, `public.leaderboard_unified`, `public.optimized_confessions`, `public.leaderboard_big_spenders`, `public.leaderboard_campus_stars`, `public.leaderboard_most_wanted`
- View setting: `public.leaderboard_unified` `security_invoker=true`
- PostgREST cache: `notify pgrst, 'reload schema'`

The migration does not update, insert, delete, or truncate user data. It does not modify payment, wallet, Premium, referral reward, notification, moderation, storage, auth, or Edge Function records/settings.

## 9. Whether Migration Was Applied Locally

No. A local Supabase database is not configured in this workspace; there is no `supabase/config.toml`, and the global Supabase CLI is unavailable.

## 10. Whether Migration Was Applied Remotely

No. The migration was not applied to production or staging.

Staging application was blocked during finalization because the connected Supabase project list contained only production (`College Date`, ref `gedoyoleoscgxgdqszzc`) and no separate staging project could be positively identified. Per the safety rules, no SQL was applied.

## 11. Anonymous Test Results

Performed redacted REST GET checks against the approved public anon configuration. No row values were printed.

| Test | Result before migration |
| --- | --- |
| `profiles?select=id&limit=1` | Failed security expectation; one row returned |
| `profiles?select=id,is_onboarded&limit=1` | Failed security expectation; one row returned |
| `profiles` public-ish fields | Failed security expectation; one row returned |
| Sensitive individual `profiles` columns | Failed security expectation for many existing columns |
| `discovery_feed_v3?select=*&limit=1` | Failed security expectation; one row returned |
| `leaderboard_unified?select=*&limit=1` | Failed security expectation; one row returned |
| `optimized_confessions?select=*&limit=1` | Failed security expectation; one row returned |

Post-migration anonymous tests are pending staging application.

## 12. Owner Test Results

Not run. No approved authenticated test account/session was available in this pass.

Required owner checks are listed in `docs/native-android/profile-rls-security-test-matrix.sql`.

## 13. Non-owner Test Results

Not run. No approved pair of authenticated test accounts/sessions was available in this pass.

Required non-owner checks are listed in `docs/native-android/profile-rls-security-test-matrix.sql`.

## 14. Remaining Risks

- Authenticated users will still be able to read non-owner private profile columns through the transitional authenticated `SELECT` policy until safe discovery/matched-profile contracts are built.
- `discovery_feed_v3` still needs a field-level security review before native discovery.
- Realtime `profiles` update subscriptions may expose full-row payloads and should be replaced with safe summary events.
- `optimized_confessions` remains a separate privacy blocker.
- Native Phase 1 profile lookup uses `name`, while live schema evidence supports `full_name`.
- Several anonymous-callable `SECURITY DEFINER` RPCs remain in production and require a separate reviewed hardening pass. Direct metadata inspection found `PUBLIC`/`anon` execute grants on:
  - `calculate_completion_score(p_user_id uuid)`
  - `get_admirers_secure(p_limit integer)`
  - `get_monetization_config()`
  - `get_my_entitlements()`
  - `get_profile_viewers_secure(p_limit integer)`
  - `has_entitlement(p_user_id uuid, p_entitlement_key text)`
  - `insert_notification(...)` short and long overloads
  - `purchase_premium_with_wallet(p_product_id text)`
  - `register_notification_device(...)`
  - `request_wallet_withdrawal(p_amount numeric, p_bank_details jsonb)`
  - `revoke_notification_device(...)`
- Supabase security advisor currently reports: `leaderboard_unified` as a security-definer view, `process_referral_rewards` with mutable `search_path`, `pg_net` installed in `public`, two RLS-enabled tables with no policies (`payment_audit_logs`, `provider_webhook_events`), multiple anonymous/authenticated callable `SECURITY DEFINER` RPCs, and leaked-password protection disabled.

## Static Review Of Proposed Migration

Reviewed migration: `supabase/migrations/20260801120000_restrict_anonymous_profile_access.sql`.

Static verdict: suitable as a first-stage staging candidate after the live metadata inspection performed on 2026-08-01, but not production-approved until staging and rollback tests pass.

Findings:

- Syntax: no universal syntax issue found for PostgreSQL 17.
- Syntax validation status: static review only. No local Supabase CLI, `psql`, or local Supabase config was available, and the scripts were not executed against production.
- Idempotency: `enable row level security`, `revoke`, `grant`, `drop policy if exists`, and `to_regclass` checks are repeatable.
- Policy assumptions: the migration now drops the exact broad live `public.profiles` policy names found through MCP metadata. It intentionally creates a transitional authenticated broad `SELECT` policy to preserve current app behavior.
- View exposure: the migration revokes anonymous view access, preserves authenticated `SELECT`, and changes `leaderboard_unified` to `security_invoker=true`. Authenticated users may still receive broad data because the transitional `profiles` policy remains broad.
- Functions: the migration does not inspect or change `SECURITY DEFINER` functions. Access-related functions still require live review for owner, `search_path`, and execute grants.
- Advisor impact: this migration is expected to address the `leaderboard_unified` security-definer view advisor if applied successfully, but it is not expected to clear unrelated function, extension, auth, payment-audit, or provider-webhook advisor findings.
- Compatibility: the migration is designed not to break current authenticated web routes, but staging smoke tests are required for discovery, leaderboard, confessions, matches, profile view/edit, notifications, and referral flows.
- Rollback: a forward rollback grant is documented, but it should restore only the minimum needed object access.
- Authenticated over-breadth: the migration does not solve possible authenticated non-owner direct `profiles` access. That is intentionally deferred until discovery/matched-profile safe contracts exist.

## Staging Safety Verdict

Verdict: safe to trial in staging only after a production-equivalent schema-only staging baseline exists, with product-flow smoke tests and rollback rehearsal required before production.

Why it is suitable for staging:

- It removes the exact anonymous `profiles` read path: `anon` table privileges plus `Public profiles are viewable by everyone` / `USING (true)`.
- It removes anonymous access to profile-derived views used by signed-in product surfaces.
- It preserves authenticated access needed by the current web application through a clearly marked transitional policy.
- It does not touch production data, payment logic, wallet balances, Premium entitlements, notification delivery, storage policies, Edge Functions, or service-role credentials.

Why it is not production-approved yet:

- Staging schema reconstruction is currently blocked because the connected staging project has no College Date app tables and the repository does not contain a complete from-empty schema history, including no canonical `CREATE TABLE public.profiles`.
- Authenticated non-owner direct `profiles` reads remain broad until a safe discovery/matched-profile API contract exists.
- `discovery_feed_v3` exposes more profile fields than native discovery should consume.
- `optimized_confessions` still exposes identifiers that need a separate anonymity review.
- SECURITY DEFINER RPC grants and advisor warnings need a separate hardening pass.
- Staging anonymous, owner, non-owner, and web/native smoke tests have not been run after applying this migration.

Do not apply this migration to production until [profile-rls-production-approval-checklist.md](C:/college-date/docs/native-android/profile-rls-production-approval-checklist.md) is complete.

## Staging Attempt On 2026-08-01

Connected staging project:

- Project: `College Date Staging`
- Ref: `pxobauvatbjncluuunyq`
- Organization: `hekkdwsfxzaplyipyoes`
- Region: `eu-west-1`

Outcome: blocked before remote writes.

Baseline inspection showed no public app tables, no public app views, no migration history, no storage buckets, no Edge Functions, and no realtime publication tables. Repository inspection showed the committed migrations assume existing base tables and no canonical `CREATE TABLE public.profiles` exists in the repository SQL.

Remote staging changes made: none.

Results are recorded in [profile-rls-staging-results.md](C:/college-date/docs/native-android/profile-rls-staging-results.md) and [staging-schema-reconstruction-plan.md](C:/college-date/docs/native-android/staging-schema-reconstruction-plan.md).

## 15. Rollback Procedure

Use a forward rollback migration only if production monitoring shows a required logged-out flow depends on anonymous access.

Prepared rollback SQL:

- [profile-rls-emergency-rollback.sql](C:/college-date/docs/native-android/profile-rls-emergency-rollback.sql)
- SHA-256: `46DE6935E6288A52153A7D9A267E848C2FD193F0B02BC60A3A59AA2738433CE9`

This rollback hash is final and authoritative for the first-stage remediation package.

Rollback review:

- Restores every broad public `profiles` policy dropped by the migration.
- Removes the transitional authenticated profile-read policy.
- Removes the new owner-delete policy introduced by the migration.
- Restores observed baseline grants for `anon`, `authenticated`, and `service_role` on `profiles` and the affected views.
- Restores `leaderboard_unified` to `security_invoker=false`.
- Clears the `public.profiles` table comment, matching the inspected production baseline.
- Does not delete or mutate table rows.
- Is intended as an emergency compatibility rollback only. It deliberately re-opens broad anonymous access and should be replaced by a narrower hotfix whenever possible.

Rollback was statically reviewed as idempotent for the inspected production-like baseline. It has not been executed in staging.

Rollback is not recommended unless a specific public route is proven to require it. A safer rollback is to grant anonymous access only to a new minimal public marketing view, not to `profiles`.

## 16. Whether Native Phase 2 Is Safe To Begin

No.

The anonymous exposure has a proposed remediation, but it has not been reviewed/applied/verified in staging or production. Native Phase 2 profile and discovery work should wait until:

- The exact live policy metadata is captured.
- The proposed migration passes staging tests.
- Anonymous profile/view REST probes return no rows.
- Authenticated owner and non-owner checks pass.
- A safe native discovery/matched-profile contract is approved.
- The native `name` versus `full_name` mismatch is corrected.
