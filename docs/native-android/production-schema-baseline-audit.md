# Production Schema Baseline Audit

Date: 2026-08-01

Production project verified:

| Field | Value |
| --- | --- |
| Project name | College Date |
| Project reference | gedoyoleoscgxgdqszzc |
| Organization | godwillgodslife's / lhxcomfjmkhcikbysuli |
| Region | eu-west-1 |
| Status | ACTIVE_HEALTHY |
| Database | Postgres 17.6.1.063, release channel ga |
| Access posture used | Read-only inspection, even though connector exposes write-capable tools |

## Metadata Sources Inspected

- Supabase project list and project details through the connected Supabase tool.
- Supabase organization list through the connected Supabase tool.
- Supabase extensions through the connected Supabase tool.
- Supabase migration history through the connected Supabase tool.
- Supabase Edge Function inventory through the connected Supabase tool.
- Supabase security and performance advisors through the connected Supabase tool.
- Read-only catalog queries against `pg_class`, `pg_namespace`, `pg_constraint`, `pg_index`, `pg_proc`, `pg_policy`, `information_schema`, `storage.buckets`, `storage.objects` policy metadata, and `pg_publication_tables`.
- Repository SQL files under `supabase/migrations/`.
- Legacy repository setup SQL under `supabase/*.sql` was reviewed for drift context only.

No application rows, `auth.users` rows, profile rows, messages, matches, payments, wallet records, referrals, media objects, push tokens, secrets, vault contents, or provider credentials were selected or exported.

## Production Inventory

| Object type | Captured result |
| --- | --- |
| Application schemas | `public`, `storage`; `auth` referenced by foreign keys; `extensions` used for extensions |
| Installed app-relevant extensions | `pgcrypto`, `uuid-ossp` |
| Excluded platform/security extensions | `supabase_vault`, `pg_net`, `pg_stat_statements` |
| Custom public enum/domain/composite types | None found |
| Public tables | 47 |
| Public views | 6 |
| Public functions | 104 |
| Public SECURITY DEFINER functions | 100 |
| Mutable function search_path warnings | 1: `public.process_referral_rewards` |
| Public table RLS policies | 121 |
| Public triggers | 15 trigger rows across 10 trigger names |
| Realtime tables | 5 |
| Storage buckets | 7 |
| Cron | `pg_cron` not installed, no `cron` schema found |

## Tables Captured

The table column/default/nullability baseline in `supabase/baseline/010_tables.sql` captures:

`admin_audit_logs`, `admin_push_broadcasts`, `ai_interactions`, `ai_profile_reviews`, `app_config`, `boosts`, `confession_claims`, `confession_comments`, `confession_reactions`, `confession_reports`, `confessions`, `conversations`, `direct_snaps`, `engagement_scores`, `entitlements`, `feed_impressions`, `gifts`, `matches`, `messages`, `monetization_config`, `notifications`, `paid_products`, `payment_attempts`, `payment_audit_logs`, `payout_details`, `profile_views`, `profiles`, `promo_codes`, `provider_webhook_events`, `referrals`, `reports`, `snapshots`, `status_updates`, `status_views`, `statuses`, `subscriptions`, `swipe_limits`, `swipe_payment_operations`, `swipes`, `transactions`, `user_notification_devices`, `user_settings`, `wallet_ledger`, `wallet_transactions`, `wallets`, `withdrawal_requests`, and `withdrawals`.

Important drift discovered: the production `public.profiles` table exists as a canonical base object, but repository migrations do not include its original creation. The baseline now records the production shape, including auth/onboarding fields such as `is_onboarded`, notification preferences, premium fields, AI review fields, presence fields, and referral fields.

## Views Captured

| View | Production `security_invoker` | Baseline decision |
| --- | --- | --- |
| `discovery_feed_v3` | true | Reproduce with `security_invoker=true`, authenticated grant only |
| `leaderboard_big_spenders` | true | Reproduce with `security_invoker=true`, authenticated grant only |
| `leaderboard_campus_stars` | true | Reproduce with `security_invoker=true`, authenticated grant only |
| `leaderboard_most_wanted` | true | Reproduce with `security_invoker=true`, authenticated grant only |
| `leaderboard_unified` | false | Reproduce with staging-safe modification: `security_invoker=true` |
| `optimized_confessions` | true | Reproduce with `security_invoker=true`, authenticated grant only |

## Functions And Triggers

Production contains a large privileged RPC surface. The baseline captures the inventory and trigger list in `supabase/baseline/030_functions_and_triggers.sql`, but does not blindly replay function bodies.

Reason: 100 of 104 public functions are `SECURITY DEFINER`, advisors flag anonymous/signed-in execution for multiple privileged functions, and one function still has mutable `search_path`. Several functions are payment, wallet, notification, admin, or referral-sensitive and must be reviewed before staging reproduction.

Trigger inventory captured:

- `confession_notification_trigger` on `confessions`
- `set_message_expiry_from_match` on `messages`
- `on_profile_view_insert` on `profile_views`
- `on_profile_created_referral` on `profiles`
- `tr_sync_referral` on `profiles`
- `track_photo_update` on `profiles`
- `on_new_referral` on `referrals`
- `tr_on_new_referral` on `referrals`
- `premium_swipe_auto_match` on `swipes`
- `swipe_notification_trigger` on `swipes`
- `on_wallet_transaction_created` on `wallet_transactions`

## RLS And Grants

Production has RLS enabled on all 47 public tables. Production also has broad `anon` and `authenticated` grants on many public objects. RLS policies still mediate row access, but broad grants increase risk when policies are overly permissive or views bypass RLS.

Known unsafe production object:

- `public.profiles` policy `"Public profiles are viewable by everyone"` allows anonymous profile-row reads.

Baseline decision:

- Enable RLS on every public table.
- Do not reproduce the anonymous profile policy.
- Create only staging-safe current-user policies for authentication/onboarding-adjacent objects.
- Grant anonymous clients only non-personal configuration/catalog reads.
- Grant profile-derived views to `authenticated` only.
- Leave the broader production policy set for a separate reviewed migration pass.

## Storage And Realtime

Storage buckets captured:

| Bucket | Public |
| --- | --- |
| `avatars` | true |
| `chat-media` | false |
| `profile-photos` | true |
| `snap_media` | true |
| `snapshot-media` | true |
| `status-media` | true |
| `voice-intros` | true |

Realtime publication membership captured:

- `public.messages`
- `public.notifications`
- `public.profiles`
- `public.wallet_transactions`
- `public.wallets`

Storage policy drift:

- Production has duplicate legacy upload policies and several policies assigned to `{public}` while checking `auth.role()`.
- The baseline replaces these with narrower authenticated-owner folder policies.

## Supabase Advisor Findings Used

Security advisor findings relevant to the baseline:

- RLS enabled with no policy on `public.payment_audit_logs`.
- RLS enabled with no policy on `public.provider_webhook_events`.
- `public.leaderboard_unified` is a security-definer view.
- `public.process_referral_rewards` has mutable `search_path`.
- `pg_net` is installed in `public`.
- Multiple anonymous-callable `SECURITY DEFINER` functions.
- Multiple signed-in callable `SECURITY DEFINER` functions.
- Leaked password protection is disabled.

Performance advisor findings relevant to follow-up:

- Several missing foreign-key index findings remain for admin/payment tables.
- Multiple RLS init-plan warnings remain.
- Multiple permissive-policy duplication warnings remain.

## Repository Migration Compatibility Matrix

| Migration | Production history | Classification | Notes |
| --- | --- | --- | --- |
| `20260522101046_premium_swipe_entitlement_fix.sql` | Applied | Already included in baseline | Production shape captured; do not rerun blindly after baseline without duplicate-object review. |
| `20260522101716_premium_subscription_swipe_rpc_fix.sql` | Applied | Already included in baseline | Function behavior requires separate RPC review. |
| `20260523090000_ai_profile_trust_foundation.sql` | Applied | Already included in baseline | AI tables/columns captured; function/Edge secrets excluded. |
| `20260523093000_ai_assistant_interactions.sql` | Applied | Already included in baseline | AI interaction table captured; no rows copied. |
| `20260523120000_production_security_hardening_phase_2.sql` | Applied | Already included in baseline | Admin/security function behavior requires review before replay. |
| `20260523123000_secure_paystack_wallet_credit.sql` | Applied | Already included in baseline | Payment RPCs excluded from baseline body replay. |
| `20260523124500_money_rpc_auth_guards.sql` | Applied | Already included in baseline | Money RPCs require separate staging test and grant review. |
| `20260525213000_chat_media_disappearing_messages.sql` | Applied | Already included in baseline | Columns, constraints, storage bucket captured; functions/triggers deferred. |
| `20260613102000_restore_profile_photo_storage_policies.sql` | Applied | Must be modified | Baseline replaces duplicate/public Storage policies with authenticated-owner policies. |
| `20260706120000_update_confession_emoji_constraint.sql` | Applied | Already included in baseline | Emoji check constraint captured. |
| `20260706130000_leaderboard_and_wallet_fixes.sql` | Applied | Must be modified | Production `leaderboard_unified` is still `security_invoker=false`; baseline changes it to true. |
| `20260707100000_referral_system_cleanup.sql` | Applied | Requires manual review | Production referral schema exists; function/trigger behavior deferred. |
| `20260707110000_performance_indexing_and_trigger_cleanup.sql` | Applied | Already included in baseline | Indexes captured; advisors still show remaining performance debt. |
| `20260714120000_notification_reliability_phase_a.sql` | Applied | Already included in baseline | Device table captured; RPC bodies deferred. |
| `20260714123000_notification_preferences_phase_c.sql` | Applied | Already included in baseline | Notification preference columns captured. |
| `20260714124500_notification_device_push_token_compat.sql` | Applied | Already included in baseline | Legacy push token compatibility captured. |
| `20260714133000_feed_impressions_foundation.sql` | Applied | Already included in baseline | Feed impressions table/constraints/indexes captured. |
| `20260715120000_admin_revenue_metrics_hardening.sql` | Applied | Requires manual review | Admin revenue RPCs excluded from body replay. |
| `20260715133000_admin_workflow_readiness.sql` | Applied | Requires manual review | Admin tables captured; admin RPCs excluded pending review. |
| `20260715143000_admin_audit_view_and_user_status.sql` | Applied | Requires manual review | Admin audit table captured; user-status RPCs excluded. |
| `20260715152000_offline_media_and_swipe_idempotency.sql` | Applied | Already included in baseline | Offline/idempotency table captured; RPC bodies deferred. |
| `20260715161000_release_gate_db_compatibility_fixes.sql` | Applied | Requires manual review | Compatibility functions excluded pending review. |
| `20260715162500_release_gate_db_compatibility_cleanup.sql` | Applied | Already included in baseline | Shape captured where present in production. |
| `20260715164000_release_gate_remaining_lint_fixes.sql` | Applied | Already included in baseline | Shape captured where present in production. |
| `20260715165000_completion_score_overload_fix.sql` | Applied | Requires manual review | Function overload behavior deferred. |
| `20260716112000_admin_audit_log_filters.sql` | Applied | Requires manual review | Admin RPC bodies deferred. |
| `20260716114500_admin_withdrawal_review_workflow.sql` | Applied | Requires manual review | Withdrawal tables captured; admin RPC bodies deferred. |
| `20260716123000_admin_user_search_pagination.sql` | Applied | Requires manual review | Admin RPC bodies deferred. |
| `20260716130000_admin_content_moderation_pagination.sql` | Applied | Requires manual review | Moderation RPC bodies deferred. |
| `20260716133000_admin_transaction_ledger_filters.sql` | Applied | Requires manual review | Admin RPC bodies deferred. |
| `20260716134500_admin_transaction_ledger_ambiguous_fix.sql` | Applied | Requires manual review | Admin RPC bodies deferred. |
| `20260716140000_admin_reasoned_config_and_promo_audit.sql` | Applied | Requires manual review | Admin config/promo RPC bodies deferred. |
| `20260716143000_admin_ops_snapshot.sql` | Applied | Requires manual review | Admin ops RPC body deferred. |
| `20260716150000_admin_push_broadcast_workflow.sql` | Applied | Requires manual review | Push broadcast table captured; Edge/function secrets excluded. |
| `20260716153000_admin_permission_foundation.sql` | Applied | Requires manual review | Admin permission RPCs deferred. |
| `20260716154500_admin_access_management.sql` | Applied | Requires manual review | Admin access RPCs deferred. |
| `20260716160000_admin_write_permission_gates.sql` | Applied | Requires manual review | Admin write RPCs deferred. |
| `20260716161500_admin_read_permission_gates.sql` | Applied | Requires manual review | Admin read RPCs deferred. |
| `20260716163000_admin_config_push_and_analytics_gates.sql` | Applied | Requires manual review | Admin/push RPCs deferred. |
| `20260721120000_premium_payment_remediation_foundation.sql` | Applied | Already included in baseline | Tables captured; payment RPC bodies excluded. |
| `20260725110000_premium_payment_remediation_grant_hardening.sql` | Applied | Must run after baseline or fold into reviewed grant pass | Local file matches intended grant tightening; safe to rehearse on staging after functions exist. |
| `20260725130000_secure_referral_code_flow.sql` | Not in production history | Must run after baseline, with review | Adds referral-code RPCs not visible in production function inventory; may duplicate table/column DDL but uses idempotent clauses. |
| `20260801120000_restrict_anonymous_profile_access.sql` | Not in production history | Must run after baseline | This is the first-stage profile RLS remediation. Baseline already implements its intent, but staging should rehearse it explicitly per the approval checklist. |

## Drift Summary

- Production contains canonical base tables that are not represented as creation migrations, especially `public.profiles`.
- Production migration history stops at `20260725110000_premium_payment_remediation_grant_hardening`; local repository has later un-applied migration files.
- Production contains `leaderboard_unified` as `security_invoker=false`; baseline changes it to true.
- Production contains broad grants and duplicate policies; baseline narrows the staging default.
- Production has many RPCs whose bodies should be replayed from reviewed migrations, not blindly copied from live production.

