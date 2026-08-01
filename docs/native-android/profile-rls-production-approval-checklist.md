# Profile RLS Production Approval Checklist

Date: 2026-08-01

Production migration is not approved until every unchecked item below is completed and evidence is linked. Production project `gedoyoleoscgxgdqszzc` must not be modified without explicit approval.

## Evidence Already Captured

- [x] Production root cause identified from prior read-only inspection: broad public `profiles` policy plus anonymous table/view grants.
- [x] Staging project positively identified: `College Date Staging` / `pxobauvatbjncluuunyq`.
- [x] Production project was not accessed during staging apply.
- [x] Staging baseline applied to `pxobauvatbjncluuunyq`.
- [x] Public app table row count in staging is `0`; no production data was copied.
- [x] Remediation migration hash verified: `BB482DE77DC813162333981A3DA69FC46AAA10BE776391ED4AB0B1849CBEAAD7`.
- [x] Rollback hash verified: `46DE6935E6288A52153A7D9A267E848C2FD193F0B02BC60A3A59AA2738433CE9`.
- [x] Remediation applied to staging.
- [x] Rollback rehearsed on staging.
- [x] Remediation reapplied after rollback.
- [x] Staging finished with anonymous profile/view access blocked.
- [x] `leaderboard_unified` verified as `security_invoker=true` in final staging state.
- [x] Hardened RPC subset applied to staging.
- [x] Hardened RPC grants verified at metadata level.
- [x] Supabase security and performance advisors run against staging.

## Required Before Production Apply

- [ ] Re-run production read-only metadata inspection immediately before any approved production write.
- [ ] Confirm Supabase dashboard Data API exposed-schema settings with the product owner.
- [ ] Create disposable staging Auth users without storing or printing credentials.
- [ ] Run REST/API anonymous tests from a network that resolves `pxobauvatbjncluuunyq.supabase.co`.
- [ ] Run authenticated owner tests with real staging sessions.
- [ ] Run authenticated non-owner tests with real staging sessions.
- [ ] Confirm owner can read/update only permitted self-profile fields.
- [ ] Confirm owner cannot update Premium, wallet, referral rewards, moderation, or admin fields.
- [ ] Confirm non-owner cannot update another profile.
- [ ] Replace or explicitly approve the transitional authenticated `profiles` `SELECT USING (true)` policy.
- [ ] Consolidate duplicate `profiles` policies to clear `multiple_permissive_policies`.
- [ ] Confirm direct authenticated reads from `discovery_feed_v3` are not needed by native Android.
- [ ] Confirm `get_discovery_profiles(...)` is the only native discovery source.
- [ ] Verify `get_discovery_profiles(...)` with live users: empty result, pagination, blocked/reported exclusion, prior swipe exclusion, and safe returned columns.
- [ ] Verify referral validation/application with live staging users.
- [ ] Verify standard swipe and mutual match RPCs with live staging users.
- [ ] Verify leaderboard and confession RPCs with live staging users.
- [ ] Decide whether intentionally public `validate_referral_code(text)` as `SECURITY DEFINER` is accepted or replaced.
- [ ] Review authenticated `SECURITY DEFINER` RPC advisor warnings and accept or harden them.
- [ ] Add or document indexes for remaining unindexed foreign keys if they are in production scope.
- [ ] Keep payment, wallet, Premium, push, call, and admin fixes out of this production profile-RLS apply unless separately approved.

## Functional Gates

- [ ] Web landing page smoke test passed after staging remediation.
- [ ] Web registration smoke test passed after staging remediation.
- [ ] Web login smoke test passed after staging remediation.
- [ ] Web password reset smoke test passed after staging remediation.
- [ ] Web onboarding smoke test passed after staging remediation.
- [ ] Web referral validation smoke test passed after staging remediation.
- [ ] Web discovery smoke test passed after staging remediation.
- [ ] Web swipe/match smoke test passed after staging remediation.
- [ ] Web profile viewing/editing smoke test passed after staging remediation.
- [ ] Web leaderboard smoke test passed after staging remediation.
- [ ] Web confessions smoke test passed after staging remediation.
- [ ] Native auth cold-launch smoke test passed against staging.
- [ ] Native login/session-restore/logout smoke tests passed against staging.
- [ ] Native incomplete-profile routing smoke test passed against staging.
- [ ] Native completed-profile routing smoke test passed against staging.

## Rollback Gates

- [x] Emergency rollback SQL exists.
- [x] Emergency rollback SHA-256 verified.
- [x] Rollback rehearsed on staging.
- [x] Remediation reapply after rollback succeeded on staging.
- [ ] Product owner understands rollback reopens anonymous `profiles` and profile-derived view access.
- [ ] Production rollback owner assigned.
- [ ] Production monitoring owner assigned.

## Production Decision

- [ ] Approved for production application.
- [ ] Production apply timestamp planned.
- [ ] Production rollback window planned.
- [ ] Monitoring queries and REST probes prepared.
- [ ] Native Android Phase 2 unblock decision recorded after production verification.

Current recommendation: do not apply to production yet.
