# Staging Schema Reconstruction Plan

Date: 2026-08-01

Staging project: `College Date Staging`
Project reference: `pxobauvatbjncluuunyq`
Organization: `hekkdwsfxzaplyipyoes`
Region: `eu-west-1`

Production project `gedoyoleoscgxgdqszzc` was not accessed during this pass.

## Baseline

The connected staging project is active and read/write capable, but the app schema is effectively empty.

Observed through staging metadata only:

- Migration history: empty.
- Public tables: none.
- Public views: none.
- Public indexes: none.
- Public foreign keys: none.
- Public triggers: none.
- Public functions: `public.rls_auto_enable()`.
- Storage buckets: none.
- Realtime publication tables: none.
- Edge Functions: none.
- Installed default extensions include `pgcrypto`, `pg_stat_statements`, `supabase_vault`, `uuid-ossp`, and `plpgsql`.

No user, profile, message, wallet, payment, storage object, or content rows were selected.

## Reconstruction Verdict

Blocked. The staging schema cannot be reconstructed safely from the committed repository migrations alone.

The migration directory begins with changes that assume a pre-existing production schema. The repository SQL files include many feature fragments, but no canonical `CREATE TABLE public.profiles` definition was found. `public.profiles` is the base table required by auth hydration, onboarding, discovery, messaging, wallet, referrals, profile photos, confessions, and the anonymous-profile remediation.

Because the base profile schema is missing, applying later migrations would fail or tempt us to invent table definitions that may not match production. That would make the security test meaningless.

## Required Base Objects Missing From Committed Migrations

At minimum, staging needs reviewed base definitions for:

- `public.profiles`
- `public.swipes`
- `public.matches`
- `public.messages`
- `public.wallets`
- `public.wallet_transactions`
- `public.notifications`
- `public.confessions`
- `public.confession_reactions`
- `public.confession_comments`
- `public.confession_claims`
- `public.app_config`
- `public.subscriptions`
- `public.boosts`
- `public.profile_views`

Some of these appear in root-level SQL fragments, but the root files are not a reliable ordered migration chain and often assume other objects already exist.

## Migration Classification

| File or group | Classification | Reason |
| --- | --- | --- |
| `supabase/migrations/20260522101046_*` through `20260725130000_*` | Requires base schema | These migrations reference existing tables such as `profiles`, `subscriptions`, `swipes`, `wallets`, `messages`, `notifications`, `confessions`, and admin objects. |
| `supabase/migrations/20260801120000_restrict_anonymous_profile_access.sql` | Deferred until staging schema exists | Requires `public.profiles` plus profile-derived views/policies/grants to exist in a production-like state before it can validate the remediation. |
| `supabase/database_setup.sql` | Requires adaptation | Creates `notifications` but immediately creates triggers on `messages` and `swipes`, which are not present in empty staging. |
| `supabase/admin_extended.sql` | Requires adaptation | Assumes `confessions`, `app_config`, `wallets`, `wallet_transactions`, and `profiles`. |
| `supabase/performance_views.sql` | Requires base schema | Defines `optimized_confessions` and `leaderboard_unified`, but depends on confession/profile/wallet/swipe tables. |
| Root `supabase_*.sql` feature fragments | Requires ordering and adaptation | They are feature/fix scripts, not a canonical base migration chain. Several overlap or supersede earlier scripts. |
| Edge Functions under `supabase/functions/` | Requires configuration | Deployment requires provider secrets and environment configuration; not needed for the profile RLS migration validation. |

## Safe Next Step

Create a reviewed baseline staging migration before applying any feature migrations. The baseline should be generated from production schema metadata without copying production data.

Acceptable sources:

- A schema-only dump from production, excluding data, auth users, storage objects, secrets, and provider credentials.
- A reviewed hand-written baseline migration derived from production metadata and committed to the repository.
- A Supabase branch/fork mechanism that creates an empty branch schema from production migrations without production data, if available and explicitly approved.

The baseline must be committed before staging writes continue.

## Stopped Work

No repository migrations were applied to staging. No synthetic users were created. The anonymous-profile remediation migration was not applied. Rollback was not rehearsed.
