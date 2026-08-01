# Profile RLS Production Approval Checklist

Date: 2026-08-01

Production migration is not approved until every item below is checked and evidence is linked.

## Required Evidence

- [x] Exact live `public.profiles` RLS status captured in [profile-rls-live-readonly-findings.md](C:/college-date/docs/native-android/profile-rls-live-readonly-findings.md).
- [x] Exact live `public.profiles` policy names, roles, commands, `USING`, and `WITH CHECK` expressions reviewed.
- [x] Exact live grants on `profiles`, `discovery_feed_v3`, `leaderboard_unified`, `optimized_confessions`, and additional profile-derived leaderboard views reviewed.
- [x] View owners and `security_invoker` settings reviewed for profile-derived views.
- [x] View definitions/columns reviewed for private profile fields.
- [x] Access-related `SECURITY DEFINER` functions identified.
- [x] Access-related function `search_path` configuration inspected at metadata level.
- [x] Execute grants for anonymous-callable `SECURITY DEFINER` functions reviewed at metadata level.
- [x] Supabase security advisor output reviewed for profile/view/function-related blockers.
- [x] Production migration history inspected; proposed `20260801120000_restrict_anonymous_profile_access` migration is not applied.
- [x] PostgREST/Data API role surface reviewed at object-grant level for `anon`, `authenticated`, and `PUBLIC` on the profile and profile-derived objects in scope.
- [x] Connected Supabase project list inspected; only production `College Date` / `gedoyoleoscgxgdqszzc` was visible.
- [ ] Supabase dashboard Data API exposed-schema settings reviewed by project owner.
- [ ] Separate staging Supabase project positively identified.

## Migration Readiness

- [x] Migration updated to match exact live policy names found on 2026-08-01.
- [x] Migration reviewed for idempotency at static SQL level.
- [x] Migration reviewed for rollback safety at static SQL level.
- [x] Migration does not disable RLS.
- [x] Migration does not grant broad public access.
- [x] Migration does not modify payment, wallet, or premium logic.
- [x] Migration does not delete production data.
- [x] Migration intentionally leaves SECURITY DEFINER RPC grant hardening to a separate approved task.
- [x] Migration hash recorded: `BB482DE77DC813162333981A3DA69FC46AAA10BE776391ED4AB0B1849CBEAAD7`.
- [x] Rollback hash recorded: `46DE6935E6288A52153A7D9A267E848C2FD193F0B02BC60A3A59AA2738433CE9`.
- [x] Rollback statically reviewed against inspected production baseline.
- [ ] Migration syntax validated in staging or an isolated database.
- [ ] Rollback syntax validated in staging or an isolated database.
- [ ] Rollback procedure executed successfully in staging after a test apply.

## Staging Gates

- [ ] Staging migration applied successfully.
- [ ] Staging post-migration inspection output archived.
- [ ] Anonymous profile table read test passed.
- [ ] Anonymous private-column read test passed.
- [ ] Anonymous discovery view read test passed.
- [ ] Anonymous leaderboard view read test passed.
- [ ] Anonymous confessions view read test passed.
- [ ] Owner self-profile read test passed.
- [ ] Owner self-profile update test passed.
- [ ] Owner protected-field update denial test passed.
- [ ] Non-owner direct profile read behavior documented as transitional; strict denial deferred until safe discovery/matched-profile contracts are available.
- [ ] Non-owner direct profile update denial test passed.
- [ ] Authenticated discovery still works under transitional policy.
- [ ] Blocking/exclusion tests passed.
- [ ] Confession anonymity test passed.

## Functional Gates

- [ ] Web landing page smoke test passed.
- [ ] Web registration smoke test passed.
- [ ] Web login smoke test passed.
- [ ] Web password reset smoke test passed.
- [ ] Web onboarding smoke test passed.
- [ ] Web referral validation smoke test passed.
- [ ] Web discovery smoke test passed.
- [ ] Web swipe smoke test passed.
- [ ] Web matches smoke test passed.
- [ ] Web messages smoke test passed.
- [ ] Web profile viewing/editing smoke test passed.
- [ ] Web leaderboard smoke test passed.
- [ ] Web confessions smoke test passed.
- [ ] Web notifications smoke test passed.
- [ ] Web premium display smoke test passed.
- [ ] Web wallet display smoke test passed.
- [ ] Native auth cold-launch smoke test passed.
- [ ] Native login/session-restore/logout smoke tests passed.
- [ ] Native incomplete-profile routing smoke test passed.
- [ ] Native completed-profile routing smoke test passed.

## Data Contract Gates

- [ ] Discovery fields reviewed and approved, or native discovery remains blocked.
- [ ] Confessions anonymity verified, or native confessions remains blocked.
- [ ] Leaderboard fields reviewed, including whether exact `total_spent` should be exposed.
- [ ] Referral validation response reviewed.
- [ ] No private user data exposed to anonymous clients.
- [ ] Authenticated private profile-field minimization is tracked as a required follow-up.
- [ ] No service-role key or secret is used in public clients.
- [ ] Rollback procedure reviewed and verified.
- [ ] Product owner approval recorded with date and approver.
- [ ] Separate SECURITY DEFINER RPC hardening task approved or explicitly deferred with accepted risk.

## Production Decision

- [ ] Approved for production application.
- [ ] Production apply timestamp planned.
- [ ] Monitoring owner assigned.
- [ ] Rollback owner assigned.
- [ ] Native Phase 2 unblock decision recorded after production verification.
