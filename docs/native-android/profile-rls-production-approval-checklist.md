# Profile RLS Production Approval Checklist

Date: 2026-08-01

Production migration is not approved until every required production gate below is completed and evidence is linked. Production project `gedoyoleoscgxgdqszzc` must not be modified without explicit approval.

## Evidence Captured

- [x] Production root cause identified from prior read-only inspection: broad public `profiles` policy plus anonymous table/view grants.
- [x] Authenticated exposure root cause identified: transitional authenticated `profiles SELECT USING (true)` policy plus raw profile-derived view grants.
- [x] Staging project positively identified: `College Date Staging` / `pxobauvatbjncluuunyq`.
- [x] Staging project region confirmed: `eu-west-1`.
- [x] Production project was not accessed or modified during this final runtime pass.
- [x] Staging baseline applied to `pxobauvatbjncluuunyq`.
- [x] Public app table row count in initial staging bootstrap was `0`; no production data was copied.
- [x] Anonymous-profile remediation migration hash verified: `BB482DE77DC813162333981A3DA69FC46AAA10BE776391ED4AB0B1849CBEAAD7`.
- [x] Anonymous-profile rollback hash verified: `46DE6935E6288A52153A7D9A267E848C2FD193F0B02BC60A3A59AA2738433CE9`.
- [x] Authenticated-profile isolation migration hash verified: `D2793AE8BF87107EEF98A7E5239956806DD703EAE38B22BCEFFAB08818D34EBC`.
- [x] Authenticated-profile rollback hash verified: `DFF9D1F6B2EABB6388123588A17D3C30573B4DAEBC4A6BCF5BA0149FCB46A096`.
- [x] Anonymous-profile remediation applied, rolled back, and reapplied on staging.
- [x] Authenticated-profile isolation migration applied, rolled back, and reapplied on staging.
- [x] Staging finished with anonymous profile/view access blocked.
- [x] Staging finished with authenticated direct full-profile access owner-only.
- [x] Direct authenticated grants on raw profile-derived views removed in staging.
- [x] `discovery_feed_v3`, `leaderboard_unified`, and `optimized_confessions` verified as `security_invoker=true`.
- [x] `get_discovery_profiles(...)` verified as the safe discovery contract.
- [x] `get_matched_profile(uuid)` verified as the safe matched-profile contract.
- [x] Disposable confirmed staging Auth users created without storing passwords or tokens in Git.
- [x] Owner runtime tests passed.
- [x] Non-owner runtime tests passed.
- [x] Anonymous runtime tests passed.
- [x] Discovery RPC runtime tests passed.
- [x] Matched-profile RPC runtime tests passed.
- [x] Referral runtime tests passed.
- [x] Confessions runtime tests passed.
- [x] Leaderboard runtime tests passed.
- [x] Auth login, refresh, logout, invalid-session, and routing-data tests passed.
- [x] Supabase security advisors run against staging.
- [x] Supabase performance advisors run against staging.
- [x] Temporary staging fixture helper redeployed as inert and JWT-protected.

## Required Before Production Apply

- [ ] Obtain explicit product-owner approval for a production write.
- [ ] Re-run production read-only metadata inspection immediately before any approved production write.
- [ ] Confirm production project identity in the Supabase dashboard: `College Date` / `gedoyoleoscgxgdqszzc`.
- [ ] Confirm Supabase dashboard Data API exposed-schema settings with the product owner.
- [ ] Confirm production Auth email settings and callback URLs will not be changed by the profile RLS migration.
- [ ] Confirm no production SMTP credentials are used in staging fixtures or local reports.
- [ ] Confirm no Supabase service-role key, signing key, payment secret, webhook secret, OpenRouter key, or Firebase credential is present in the migration/docs commit.
- [ ] Review the staging Auth trigger finding in `public.handle_new_user()` and either patch it before production or explicitly accept the signup metadata requirement.
- [ ] Decide whether intentionally public `validate_referral_code(text)` as `SECURITY DEFINER` is accepted or should be replaced by a safer endpoint.
- [ ] Review authenticated `SECURITY DEFINER` RPC advisor warnings function-by-function and accept or harden them.
- [ ] Confirm `get_discovery_profiles(...)` remains the only discovery source for native Android.
- [ ] Confirm `get_matched_profile(uuid)` remains the only matched-user detail source for native Android.
- [ ] Confirm clients do not depend on direct reads from `discovery_feed_v3`, `leaderboard_unified`, or `optimized_confessions`.
- [ ] Confirm product owner accepts that direct non-owner `profiles` reads will be blocked in production.
- [ ] Prepare monitoring probes for anonymous, owner, and non-owner profile access immediately after production apply.
- [ ] Keep payment, wallet, Premium, push, call, admin, and full messaging changes out of this production profile-RLS apply unless separately approved.

## Functional Gates

- [x] Staging anonymous `profiles` probe rejected.
- [x] Staging anonymous authenticated-only RPC probes rejected.
- [x] Staging owner can read own profile.
- [x] Staging owner can update approved own fields.
- [x] Staging owner cannot update Premium, wallet, referral rewards, moderation, push, or AI-review fields.
- [x] Staging owner cannot change profile ownership.
- [x] Staging non-owner cannot read another full profile directly.
- [x] Staging non-owner cannot update another profile.
- [x] Staging discovery excludes caller, prior swipes, blocked/reported users, and private fields.
- [x] Staging matched-profile RPC returns safe fields only for a real match.
- [x] Staging matched-profile RPC rejects anonymous, non-matched, blocked, invalid UUID, and caller-override access.
- [x] Staging referral validation/application tests passed.
- [x] Staging confession feed/reaction tests passed.
- [x] Staging leaderboard tests passed.
- [x] Staging Auth login, refresh, logout, and invalid-session tests passed.
- [ ] Web landing page smoke test against production after approved apply.
- [ ] Web registration smoke test against production after approved apply.
- [ ] Web login smoke test against production after approved apply.
- [ ] Web password reset smoke test against production after approved apply.
- [ ] Web onboarding smoke test against production after approved apply.
- [ ] Web referral validation smoke test against production after approved apply.
- [ ] Web discovery smoke test against production after approved apply.
- [ ] Web swipe/match smoke test against production after approved apply.
- [ ] Web profile viewing/editing smoke test against production after approved apply.
- [ ] Web leaderboard smoke test against production after approved apply.
- [ ] Web confessions smoke test against production after approved apply.
- [ ] Native auth cold-launch smoke test against staging app configuration.
- [ ] Native login/session-restore/logout smoke tests against staging app configuration.
- [ ] Native incomplete-profile routing smoke test against staging app configuration.
- [ ] Native completed-profile routing smoke test against staging app configuration.

## Advisor Gates

- [x] Duplicate permissive `profiles` policies resolved in staging.
- [x] No new anonymous `profiles` grant introduced in staging.
- [x] No direct client grants remain on reviewed raw profile-derived views in staging.
- [x] Reviewed app-facing RPCs use `search_path = ''`.
- [x] Trigger/internal helper functions are not directly executable by client roles in the reviewed subset.
- [ ] Resolve or accept staging `rls_enabled_no_policy` INFO findings for deferred schema-only tables.
- [ ] Resolve or accept `anon_security_definer_function_executable` warning for `validate_referral_code(text)`.
- [ ] Resolve or accept authenticated `SECURITY DEFINER` warnings for app-facing RPCs.
- [ ] Enable or intentionally defer Supabase Auth leaked-password protection.
- [ ] Add or intentionally defer indexes for remaining unindexed foreign keys:
  - `admin_audit_logs.admin_user_id`
  - `admin_push_broadcasts.admin_user_id`
  - `entitlements.product_id`
  - `payment_attempts.product_id`
  - `swipe_payment_operations.swiped_id`
  - `wallet_ledger.wallet_id`

## Rollback Gates

- [x] Emergency rollback SQL exists.
- [x] Emergency rollback SHA-256 verified.
- [x] Rollback rehearsed on staging.
- [x] Remediation reapply after rollback succeeded on staging.
- [ ] Product owner understands rollback reopens the old broad profile/view access contract.
- [ ] Production rollback owner assigned.
- [ ] Production monitoring owner assigned.
- [ ] Production rollback timestamp/window planned.

## Production Decision

- [ ] Approved for production application.
- [ ] Production apply timestamp planned.
- [ ] Production rollback window planned.
- [ ] Monitoring queries and REST probes prepared.
- [ ] Post-apply production smoke-test owner assigned.

Current recommendation: the profile RLS and authenticated profile isolation package is a production candidate, but it must not be applied until the unchecked production approval gates are explicitly accepted by the product owner.

Native Android Phase 2 may begin against staging for auth/profile/discovery/matched-profile contracts. Production promotion remains a separate approval event.
