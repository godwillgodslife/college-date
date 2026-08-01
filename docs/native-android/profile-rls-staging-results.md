# Profile RLS Staging Results

Date: 2026-08-01

## 1. Staging Project

- Project name: `College Date Staging`
- Project reference: `pxobauvatbjncluuunyq`
- Organization: `hekkdwsfxzaplyipyoes`
- Region: `eu-west-1`
- Status: `ACTIVE_HEALTHY`
- Capability: read/write

Production project `gedoyoleoscgxgdqszzc` was not visible in the current connection and was not accessed.

## 2. Hash Verification

Passed.

- Migration: `supabase/migrations/20260801120000_restrict_anonymous_profile_access.sql`
- Migration SHA-256: `BB482DE77DC813162333981A3DA69FC46AAA10BE776391ED4AB0B1849CBEAAD7`
- Rollback: `docs/native-android/profile-rls-emergency-rollback.sql`
- Rollback SHA-256: `46DE6935E6288A52153A7D9A267E848C2FD193F0B02BC60A3A59AA2738433CE9`

## 3. Baseline State

Staging is effectively empty for the College Date application schema.

- Existing migrations: none.
- Public tables: none.
- Public views: none.
- Public indexes: none.
- Public foreign keys: none.
- Public triggers: none.
- Public functions: `public.rls_auto_enable()`.
- Storage buckets: none.
- Realtime publication tables: none.
- Edge Functions: none.
- Storage metadata tables: default Supabase storage tables exist with RLS enabled.

No sensitive rows were selected. No production data was copied.

## 4. Schema Reconstruction Result

Blocked before remote writes.

The repository does not contain a complete from-empty migration history. The committed migrations and root SQL fragments assume `public.profiles` and other base objects already exist. A repository search found no canonical `CREATE TABLE public.profiles` statement.

Because `public.profiles` is required by the remediation migration and by the profile, discovery, messaging, wallet, referral, and confession objects, reconstructing staging from the current repository would require inventing schema. That would not be production-equivalent or safe.

See [staging-schema-reconstruction-plan.md](C:/college-date/docs/native-android/staging-schema-reconstruction-plan.md).

## 5. Migration Result

Not applied.

Reason: staging schema reconstruction is blocked by missing base schema. The remediation migration requires `public.profiles` and profile-derived views/policies/grants to exist.

Objects modified remotely: none.

## 6. Rollback Result

Not rehearsed.

Reason: remediation migration was not applied. Rehearsing rollback without a reconstructed schema would not validate the production-like rollback path.

## 7. Anonymous Tests

Blocked.

Reason: `public.profiles`, `discovery_feed_v3`, `leaderboard_unified`, `optimized_confessions`, and the other target views do not exist in staging.

## 8. Owner Tests

Blocked.

Reason: no app schema and no synthetic test users were created.

## 9. Non-Owner Tests

Blocked.

Reason: no app schema and no synthetic test users were created.

## 10. Functional Smoke Tests

| Flow | Result | Notes |
| --- | --- | --- |
| Registration | Blocked | Staging app schema not reconstructed. |
| Login | Blocked | Synthetic users were not created. |
| Password reset | Not tested | Auth configuration was not changed. |
| Onboarding | Blocked | `profiles` does not exist. |
| Referral validation | Blocked | Referral RPC/table not reconstructed. |
| Own-profile loading | Blocked | `profiles` does not exist. |
| Profile editing | Blocked | `profiles` does not exist. |
| Discovery | Blocked | `discovery_feed_v3` and base discovery objects do not exist. |
| Swiping | Blocked | `swipes` does not exist. |
| Matches | Blocked | `matches` does not exist. |
| Messaging | Blocked | `messages` does not exist. |
| Leaderboard | Blocked | `leaderboard_unified` does not exist. |
| Confessions | Blocked | confession tables/views do not exist. |
| Notifications | Blocked | app notification tables/functions not reconstructed. |
| Premium display | Blocked | premium/subscription objects not reconstructed. |
| Wallet display | Blocked | wallet objects not reconstructed. |

## 11. Security Advisor Results

Staging security advisor findings:

- Medium: `public.rls_auto_enable()` is a `SECURITY DEFINER` function executable by `anon`.
- Medium: `public.rls_auto_enable()` is a `SECURITY DEFINER` function executable by `authenticated`.

Staging performance advisor findings:

- None returned.

These are baseline staging helper-function findings, not findings caused by the profile remediation migration.

## 12. Schema Drift

Major drift from captured production metadata:

- Production had many public tables, policies, views, functions, storage policies, and migrations.
- Staging currently has no College Date public app tables or views.
- Staging has no Edge Functions.
- Staging has no storage buckets.
- Staging has no migration history.

## 13. External Configuration Blockers

Not configured or not verified:

- Supabase Auth test users.
- Staging web environment variables.
- Staging native Android local configuration.
- Storage buckets and policies.
- Edge Function secrets.
- Payment provider test settings.
- Push notification provider settings.

## 14. Regressions

None observed, because no staging app schema changes were applied.

## 15. Remaining Security Work

- Add a production-equivalent schema-only staging baseline without copying production data.
- Apply only reviewed migrations after the baseline exists.
- Run the anonymous/owner/non-owner security matrix.
- Rehearse rollback and reapply remediation.
- Review and harden `SECURITY DEFINER` function grants separately.
- Build safe authenticated profile/discovery contracts to remove transitional broad authenticated profile reads.

## 16. Production Recommendation

Production promotion is not recommended.

The remediation package remains prepared and committed, but it has not been validated against a reconstructed staging schema.

## 17. Native Phase 2

Native Android Phase 2 remains blocked.
