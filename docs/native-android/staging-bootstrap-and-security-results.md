# Staging Bootstrap And Security Results

Date: 2026-08-01

Scope: staging-only reconstruction and security verification for The College Date profile-access remediation. The connected Supabase project used for every remote operation was `College Date Staging` / `pxobauvatbjncluuunyq`. Production project `gedoyoleoscgxgdqszzc` was not accessed or modified.

## Staging Identity

| Field | Result |
| --- | --- |
| Project name | `College Date Staging` |
| Project reference | `pxobauvatbjncluuunyq` |
| Organization | `hekkdwsfxzaplyipyoes` |
| Region | `eu-west-1` |
| Status | `ACTIVE_HEALTHY` |
| Database | Postgres `17.6.1.155` |
| Capability observed | Read/write tooling is available, but this task treated production as forbidden and staging as the only writable target. |

Initial staging state before College Date bootstrap:

- Migration history was empty.
- No College Date public app tables or views existed.
- No Storage buckets existed.
- One pre-existing public function existed: `public.rls_auto_enable()`.
- Supabase security advisor reported `public.rls_auto_enable()` as a client-executable `SECURITY DEFINER` function.
- No production data was copied.

Final staging row-count check after bootstrap:

| Check | Result |
| --- | ---: |
| Public base tables | 47 |
| Public rows across all public tables | 0 |
| Non-empty public tables | 0 |
| Storage objects | 0 |

## SQL Hashes

| File | SHA-256 |
| --- | --- |
| `supabase/baseline/000_extensions_and_types.sql` | `474325227730D18754A04178515772B8E3740AD2A229A291E0E292B6BC46C13D` |
| `supabase/baseline/010_tables.sql` | `A003DB1C5A61D4BD309979623E4A5DDB3227687CD3F2CB02E7FDD074531E7B51` |
| `supabase/baseline/020_constraints_and_indexes.sql` | `BBD88EF9CA3B55FAFE0EBC3B86EA54577A1BF0A7A577F37153E61ABF4729650E` |
| `supabase/baseline/030_functions_and_triggers.sql` | `EF79B6D5AADE3506ECBC90BE6040D165633DE84024D89B1C61C379166A952C0C` |
| `supabase/baseline/035_required_functions_hardened.sql` | `528C4B85DD6B7482B02F235840BDC674B604397192C73E185B9DB561C4D85917` |
| `supabase/baseline/040_views.sql` | `1419538EC74A62EB4F24E56DDF929CDBFE5851BDF31B11FC87F370978D35CD6F` |
| `supabase/baseline/050_rls_and_grants.sql` | `E55D6AC5026B20293DB2D5DD2856C80FF87346202635ADAE9B337BAEF7528CD4` |
| `supabase/baseline/060_storage_and_realtime.sql` | `B40F0180452082D394ECF832732F807DAB6C92207CEF48F01F38D9D200C5FD30` |
| `supabase/baseline/070_staging_seed_structure.sql` | `527795D5DE1FF5F030DF1B7AC3ECE50FFC54BB035A46209FCBD8D009B4969FAE` |
| `supabase/migrations/20260801120000_restrict_anonymous_profile_access.sql` | `BB482DE77DC813162333981A3DA69FC46AAA10BE776391ED4AB0B1849CBEAAD7` |
| `docs/native-android/profile-rls-emergency-rollback.sql` | `46DE6935E6288A52153A7D9A267E848C2FD193F0B02BC60A3A59AA2738433CE9` |

The remediation and rollback hashes match the required authoritative values.

## Pre-Apply Validation

| Validation | Result |
| --- | --- |
| File existence | Passed for every baseline, remediation, and rollback file. |
| Secret scan | Passed. No service-role key, payment secret, webhook secret, OpenRouter key, or Firebase secret was found. |
| Production URL/ref scan | Found production-ref comments in baseline headers only; no production URL or secret was embedded. |
| Direct production-data insert scan | Passed. Inserts found are inside RPC/trigger function bodies only, not seed data. |
| Placeholder scan | Passed. No unresolved placeholder requiring runtime replacement was found. |
| Ownership scan | Passed. No `ALTER ... OWNER` production-only ownership statement was found. |
| Grant scan | Reviewed. Baseline grants are explicit; remediation removes anonymous profile/view grants; rollback deliberately restores the old broad access contract. |
| `SECURITY DEFINER` scan | Reviewed. Hardened app RPCs use `set search_path to ''`; staging legacy `rls_auto_enable()` remains `SECURITY DEFINER` with `search_path=pg_catalog` but is no longer executable by client roles. |

## Local Corrections Before/During Apply

Two staging-safe corrections were required and are now part of the local baseline package:

1. `supabase/baseline/000_extensions_and_types.sql`
   - Added a conditional revoke for pre-existing `public.rls_auto_enable()`.
   - Purpose: remove client/PUBLIC execute access without dropping or altering the helper body.

2. `supabase/baseline/035_required_functions_hardened.sql`
   - Simplified `public.calculate_completion_score()` to compute directly from the trigger `new` row instead of building a dynamic JSON object.
   - Purpose: avoid Supabase connector rejection of the original function body while preserving the intended completion-score behavior.

## Application Ledger

| Order | Remote migration name | Source | Result |
| ---: | --- | --- | --- |
| 1 | `baseline_000_extensions_and_types` | `000_extensions_and_types.sql` | Applied. Required extensions installed; `rls_auto_enable()` client execute revoked. |
| 2 | `baseline_010_tables` | `010_tables.sql` | Applied. 47 public base tables created. |
| 3 | `baseline_020_constraints_and_indexes` | `020_constraints_and_indexes.sql` | Applied. 47 primary keys, 23 unique constraints, 39 checks, 65 foreign keys, 161 indexes observed. |
| 4 | `baseline_030_functions_and_triggers_inventory` | `030_functions_and_triggers.sql` | Applied. Inventory/comment package only. |
| 5a | `baseline_035a_referral_profile_bootstrap` | First chunk of `035_required_functions_hardened.sql` | Applied. Referral/profile bootstrap functions created. |
| 5b | `baseline_035b_profile_onboarding_rpcs` | Attempted chunk of `035_required_functions_hardened.sql` | Connector rejected request with `INVALID_ARGUMENT`; verification showed no partial function creation from the rejected chunk. |
| 5c | `baseline_035b_profile_read_rpcs` | Smaller attempted chunk | Connector rejected request with `INVALID_ARGUMENT`; issue isolated to the original `calculate_completion_score()` body. |
| 5d | `p035b1_completion_score` | Patched function | Applied. |
| 5e | `p035b2_profile_read` | `update_photo_timestamp()`, `get_current_profile()` | Applied. |
| 5f | `p035b3_profile_update_presence` | profile update/presence functions | Applied. |
| 5g | `p035c_discovery_quota` | quota/discovery functions | Applied. |
| 5h | `p035d_feed_swipe` | feed impression/swipe functions | Applied. |
| 5i | `p035e_match_leaderboard_confessions` | match/leaderboard/confession functions | Applied. |
| 5j | `p035f_triggers_grants` | triggers and function grants | Applied. |
| 6 | `baseline_040_views` | `040_views.sql` | Applied. 6 public views created with `security_invoker=true`. |
| 7 | `baseline_050_rls_and_grants` | `050_rls_and_grants.sql` | Applied. All 47 public base tables have RLS enabled. |
| 8 | `baseline_060_storage_and_realtime` | `060_storage_and_realtime.sql` | Applied. 7 buckets and 5 realtime publication table entries observed. |
| 9 | `baseline_070_staging_seed_structure` | `070_staging_seed_structure.sql` | Applied. Empty structure/comment package only. |
| 10 | `restrict_anonymous_profile_access_20260801120000` | Remediation migration | Applied. Anonymous profile/view access removed. |
| 11 | `staging_profile_rls_rollback_rehearsal` | Emergency rollback SQL | Applied on staging only. Old broad anonymous contract restored as expected. |
| 12 | `staging_profile_rls_reapply_remediation` | Remediation migration | Applied again. Staging returned to the remediated state. |

The `035` file was applied as reviewed sub-migrations because the connector rejected the full function package/chunk around one function body. The rejected calls did not partially execute. This is a staging bootstrap deviation to keep in the production checklist; production should use a single reviewed migration file or a deliberately split committed sequence, not ad hoc connector chunks.

## Final Object Summary

| Object type | Final count |
| --- | ---: |
| Public base tables | 47 |
| Public views | 6 |
| Public functions | 22 |
| Public `SECURITY DEFINER` functions | 15 |
| Public policies | 24 |
| Public base tables without RLS | 0 |
| Storage buckets | 7 |
| Storage objects | 0 |
| Realtime publication tables | 5 |

The 22 public functions include the pre-existing staging helper `public.rls_auto_enable()`. The hardened College Date RPC subset contains 21 functions.

## Remediation Verification

Final staging metadata after rollback and reapply:

| Check | Result |
| --- | --- |
| Broad policy `Public profiles are viewable by everyone` | Absent |
| `anon` can select `public.profiles` | No |
| `anon` can select `public.discovery_feed_v3` | No |
| `anon` can select `public.leaderboard_unified` | No |
| `anon` can select `public.optimized_confessions` | No |
| `authenticated` can select `public.profiles` | Yes |
| `authenticated` can select `public.discovery_feed_v3` | Yes |
| `public.leaderboard_unified` options | `security_invoker=true` |
| `public.profiles` policy count | 9 |

Owner policies exist, but there are duplicate owner policies because the safer baseline and the first-stage remediation both define owner insert/select/update/delete policies. The Supabase performance advisor flags this as `multiple_permissive_policies`.

## RLS Security Matrix

| Area | Result | Evidence/notes |
| --- | --- | --- |
| Anonymous direct `profiles` access | Passed by metadata | `anon` has no `SELECT` privilege and the public read policy is absent. |
| Anonymous profile-derived view access | Passed by metadata | `anon` has no `SELECT` on `discovery_feed_v3`, `leaderboard_unified`, or `optimized_confessions`. |
| Anonymous authenticated-only RPC calls | Passed by metadata | `anon` cannot execute app RPCs except intentionally public `validate_referral_code(text)`. |
| Owner self-profile access | Blocked | Requires disposable staging Auth users and a real authenticated session. Local DNS cannot resolve the staging Supabase hostname. |
| Owner update/onboarding | Blocked | Same Auth/session blocker. |
| Owner protected-field denial | Blocked | Same Auth/session blocker. |
| Non-owner direct profile read | Failed as a final security goal by policy review | The transitional authenticated `SELECT` policy uses `true`, so any authenticated user may directly read profile rows/columns until a follow-up migration removes this compatibility policy. |
| Non-owner update denial | Not fully tested | Owner-scoped update policies exist, but live session tests are blocked. |
| Block exclusion | Not fully tested | `get_discovery_profiles` excludes report-based relationships; no dedicated block table was confirmed. |

## RPC Verification

Metadata verification passed for the hardened RPC package:

- 21 College Date functions are present.
- 14 College Date functions are `SECURITY DEFINER`.
- All 21 College Date functions set `search_path` to `''`.
- Default `PUBLIC` function execution was revoked.
- `anon` can execute only `validate_referral_code(text)`.
- `authenticated` can execute the approved app-facing RPC subset.
- Trigger/internal functions are not executable by `anon` or `authenticated`.

Functional caller tests are blocked until staging Auth/API access works from the test machine. No test passwords, tokens, or user rows were stored or printed.

## Discovery Contract Verification

`public.get_discovery_profiles(integer, integer, jsonb)` returns only:

`id`, `full_name`, `username`, `gender`, `age`, `university`, `faculty`, `department`, `level`, `bio`, `avatar_url`, `photos`, `profile_photos`, `interests`, `intro_prompt`, `voice_intro_url`, `anthem`, `attraction_goal`, `is_verified`, `completion_score`, `last_seen_at`, `last_active`, `is_live`, `is_boosted`, `seen_count`.

It does not return email, phone, push identifiers, wallet fields, referral fields, notification settings, moderation flags, AI review fields, or admin flags.

Function body review confirmed:

- caller identity comes from `auth.uid()`;
- caller must be authenticated, have a profile, be onboarded, and not be banned/shadow-banned;
- candidates must be onboarded and not banned/shadow-banned/blocked/incognito;
- prior swipes and existing matches are excluded;
- active reports between caller and candidate are excluded as a staging fallback;
- `p_limit` is clamped to `1..50`;
- `p_offset` is clamped to `>= 0`.

Important caveat: `public.discovery_feed_v3` itself still projects private/sensitive columns. It is no longer anonymously readable, but it is still granted to authenticated users and depends on the broad transitional `profiles` policy. Native discovery should use `get_discovery_profiles(...)`, not direct `profiles` or `discovery_feed_v3` reads.

## Advisor Findings

Security advisor findings after bootstrap:

- `rls_enabled_no_policy` INFO findings on deferred later-phase tables. This is expected for tables intentionally closed by RLS until their feature policies/RPCs are reviewed.
- `anon_security_definer_function_executable` WARN for `validate_referral_code(text)`. This is intentional for public referral-code validation during signup.
- `authenticated_security_definer_function_executable` WARN for app-facing RPCs such as discovery, swipe, referral, leaderboard, and confession functions. These are intentional staging APIs but require live functional testing before production promotion.

Performance advisor findings after bootstrap:

- Six unindexed foreign-key INFO findings:
  - `admin_audit_logs.admin_user_id`
  - `admin_push_broadcasts.admin_user_id`
  - `entitlements.product_id`
  - `payment_attempts.product_id`
  - `swipe_payment_operations.swiped_id`
  - `wallet_ledger.wallet_id`
- Many `unused_index` INFO findings because staging has no traffic.
- `multiple_permissive_policies` WARN on `public.profiles` for authenticated `SELECT`, `INSERT`, `UPDATE`, and `DELETE`, caused by baseline owner policies plus remediation owner policies.

No advisor finding was auto-fixed beyond the scoped staging baseline corrections described above.

## Functional Smoke Tests

| Flow | Result | Notes |
| --- | --- | --- |
| Registration | Blocked | Local DNS cannot resolve `pxobauvatbjncluuunyq.supabase.co`; REST Auth signup cannot be reached. |
| Login | Blocked | Same DNS/Auth blocker. |
| Password reset | Blocked | Same DNS/Auth blocker. |
| Onboarding/profile creation | Blocked | Requires synthetic Auth users. |
| Referral validation | Metadata only | Function grant exists for anon/authenticated; live API call blocked by DNS. |
| Own-profile loading | Blocked | Requires authenticated test session. |
| Profile editing | Blocked | Requires authenticated test session. |
| Discovery | Metadata contract passed; functional blocked | Safe RPC contract verified by function result/body. |
| Standard swipe | Metadata only | Function exists and grant is authenticated-only; live caller test blocked. |
| Mutual match | Metadata only | Function exists and grant is authenticated-only; live caller test blocked. |
| Leaderboard | Metadata contract passed; functional blocked | RPC projection avoids wallet-spend fields. |
| Confessions | Metadata contract passed; functional blocked | RPC projection avoids author/reaction identifiers. |
| Confession reactions | Metadata only | Function exists and grant is authenticated-only; live caller test blocked. |
| Messaging/payments/notifications/calls | Deferred | Not configured or in scope for this task. |

## Rollback Rehearsal

Rollback SHA-256 was verified as `46DE6935E6288A52153A7D9A267E848C2FD193F0B02BC60A3A59AA2738433CE9`.

Staging rollback apply result:

- Applied successfully as `staging_profile_rls_rollback_rehearsal`.
- Restored `Public profiles are viewable by everyone`.
- Restored anonymous `SELECT` on `profiles`, `discovery_feed_v3`, `leaderboard_unified`, and `optimized_confessions`.
- Set `leaderboard_unified` to `security_invoker=false`.

Reapply result:

- Applied successfully as `staging_profile_rls_reapply_remediation`.
- Removed the public profile policy again.
- Removed anonymous table/view access again.
- Restored `leaderboard_unified` to `security_invoker=true`.

Staging finished in the remediated state.

## Blockers

1. Local DNS cannot resolve `pxobauvatbjncluuunyq.supabase.co`, so Auth REST signup/login/password-reset and API caller tests could not run from this machine.
2. Direct synthetic `auth.users` creation through SQL was rejected by Supabase tooling/platform restrictions.
3. The remediation still includes a transitional authenticated `profiles` `SELECT USING true` policy, so authenticated non-owner private profile reads remain possible until the web/native data contract is tightened.
4. `discovery_feed_v3` remains too broad for native discovery even though anonymous access is blocked.
5. Deferred RLS policies for later-phase tables must be designed before messaging, payments, wallet, notifications, premium, calls, or admin flows are tested in staging.

## Production Promotion Recommendation

Production promotion is not recommended yet.

The staging schema bootstrap, remediation apply, rollback, and reapply mechanics all worked. However, production should wait until:

- a connected environment can create disposable staging Auth users;
- live anonymous/owner/non-owner REST/RPC tests pass with real staging sessions;
- the broad authenticated profile policy is replaced by safe profile/discovery/matched-profile contracts;
- duplicate profile policies are consolidated;
- product owner accepts or resolves the remaining advisor findings.

## Native Android Phase 2 Verdict

Native Android Phase 2 should not begin yet. The database foundation is much closer, but authenticated profile isolation and live Auth/RPC smoke tests are still blocked.
