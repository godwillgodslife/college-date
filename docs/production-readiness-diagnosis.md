# Production Readiness Diagnosis - The College Date

Date: 2026-05-23

Scope: live Supabase schema/RLS/functions, local SQL history, app Supabase usage, Edge Functions, storage buckets, and the Android/web monetization-critical flows.

## Executive Summary

The application is functional enough for closed testing, but it is not production-clean yet. The biggest risks are not normal syntax errors; they are schema drift and authorization drift from many historical SQL fixes being layered over one another.

The live database has RLS enabled on all public tables, which is good. However, it also has duplicated policies, security-definer views, public callable security-definer RPCs, stale RPC overloads, and a few app/schema mismatches that can break features or expose data.

## Hardening Applied On 2026-05-23

The highest-risk live database mismatches found during this diagnosis were fixed directly on Supabase project `gedoyoleoscgxgdqszzc`.

- Converted `discovery_feed_v3`, `leaderboard_unified`, and `optimized_confessions` to `security_invoker = true`.
- Added hardened `public.is_app_admin()` using `app_metadata` plus the owner email fallback, then replaced unsafe admin metadata checks in key admin policies/RPCs.
- Removed public/anon execute access from public functions and removed direct authenticated execution from trigger-only functions.
- Dropped stale dangerous RPC overloads, including old `accept_swipe_request`, `process_swipe_payment`, `purchase_boost`, `use_super_swipe`, and JSON `update_profile_data` overloads.
- Added compatibility columns `profiles.premium_expires_at` and `profiles.last_active`.
- Normalized presence functions so both overloads update `last_seen_at`, `last_seen`, `last_active`, `is_online`, and `is_live` consistently.
- Added atomic `send_super_swipe(p_target_id uuid)` and updated the app to use it instead of inserting invalid `swipes.type = 'super_swipe'`.
- Fixed wallet RPC usage in the app so wallet deposits/debits call the existing `increment_wallet_balance` and `decrement_wallet_balance` RPCs with the correct parameter names.
- Added missing foreign-key indexes flagged by the Supabase performance advisor.
- Re-ran `npm run build` and `npx cap sync android` successfully.
- Built Android bundle `release/TheCollegeDate-2.2.15-vc12-production-hardening.aab`.

Remaining advisor warnings are now mostly deeper production cleanup rather than immediate blockers:

- Public storage buckets still allow broad object listing.
- Some app-facing SECURITY DEFINER RPCs are intentionally callable by authenticated users and should be reviewed one by one.
- RLS policies still have duplicate permissive policies and `auth.uid()` init-plan warnings.
- `pg_net` remains installed in `public`.
- Supabase leaked password protection is disabled in Auth settings.

## Critical Findings

1. Security-definer views exist in the exposed `public` schema.
   - `public.discovery_feed_v3`
   - `public.leaderboard_unified`
   - `public.optimized_confessions`
   - Supabase flags these as external security errors because views can bypass the caller's RLS context unless created with `security_invoker = true`.

2. Admin authorization uses unsafe `user_metadata`.
   - Several policies/functions check:
     - `auth.jwt()->'user_metadata'->>'is_admin'`
   - Supabase treats user metadata as user-editable, so it should not be trusted for authorization.
   - Admin state should move to `raw_app_meta_data`/`app_metadata` or a private admin table checked by a hardened security-definer helper.

3. Many privileged RPCs are executable by `anon` and `authenticated`.
   - Examples:
     - `admin_get_dashboard_stats`
     - `admin_get_analytics`
     - `admin_toggle_ban`
     - `admin_toggle_verify`
     - `process_swipe_payment`
     - `purchase_boost`
     - `use_super_swipe`
     - `update_profile_data`
     - `update_user_presence`
   - Some are intentionally app-callable, but the grants are too broad and inconsistent for production.
   - Admin RPCs should not be callable by normal signed-in users without a server-side admin check.

4. Stale RPC overloads conflict with the current schema.
   - `use_super_swipe(p_user_id, p_target_id)` inserts `swipes.type = 'super_swipe'`, but live `swipes_type_check` only allows `standard` and `premium`.
   - That overload also references `is_super_swipe`, which is not present in the current `swipes` table.
   - `accept_swipe_request(p_request_id, p_acceptor_id)` updates `swipes.updated_at`, but `swipes` has no `updated_at` column.
   - The app currently calls the safer overloads, but stale overloads are still public callable and should be removed or locked down.

5. Super Swipe app flow is likely broken.
   - `src/services/swipeService.js` inserts `swipes.type = 'super_swipe'`.
   - The live database constraint only allows:
     - `standard`
     - `premium`
   - Result: Super Swipe insert will fail unless the app path is changed to store Super Swipe as `type = 'premium'`/`is_priority = true`, or the constraint is expanded and related functions are updated.

6. Presence/live status is inconsistent.
   - App display now relies on `last_seen_at`.
   - `update_user_presence()` sets `last_seen_at` and `is_live = true`.
   - `update_user_presence(p_user_id, p_is_online)` sets `last_seen` and `show_online_status`, not `last_seen_at`.
   - This can explain incorrect "live" signals if different paths call different overloads.

7. Wallet and transaction policies are too permissive/duplicated.
   - `wallets` has `Anyone can view wallet spend` with `qual = true`, exposing wallet rows broadly.
   - There are duplicate wallet and transaction policies for the same roles/actions.
   - This is both a privacy risk and a performance risk.

8. Storage is public and policy-sprawled.
   - Buckets are public:
     - `avatars`
     - `chat-media`
     - `profile-photos`
     - `snap_media`
     - `snapshot-media`
     - `status-media`
     - `voice-intros`
   - Some buckets have duplicate policies and permissive public access.
   - Public media may be acceptable for dating profiles/statuses, but chat media and voice notes should be reviewed carefully before production.

9. Local migration history is incomplete.
   - Only two formal migrations are in `supabase/migrations`.
   - The repo contains many loose SQL files, meaning the actual live database cannot currently be reproduced cleanly from migrations alone.
   - This is a release/rollback risk.

## Functional Flow Status

Likely OK or close:
- Basic auth/profile loading.
- Android Google login after recent OAuth fixes.
- Premium subscription activation through RevenueCat/Google Play.
- Premium standard swipe limit bypass after the latest RPC fix.
- Basic match/chat when `matches` and `messages` policies line up.

Needs production hardening:
- Admin dashboard and moderation.
- Super Swipe.
- Boost purchase semantics.
- Live/presence accuracy.
- Notifications and push delivery verification.
- Wallet privacy.
- Storage privacy and upload policy cleanup.
- Reproducible migrations.

## Recommended Fix Order

1. Create a database hardening migration branch.
2. Replace admin checks based on `user_metadata`.
3. Revoke public/anon execute from admin and stale RPCs.
4. Drop or replace stale overloads that reference missing columns/invalid enum values.
5. Decide final Super Swipe data model:
   - either allow `swipes.type = 'super_swipe'`
   - or keep `type = 'premium'` plus `is_priority = true`
6. Normalize presence to one source of truth:
   - `last_seen_at`
   - optional `is_live` derived from timestamp, not manually trusted forever
7. Convert exposed views to `security_invoker = true` where possible.
8. Consolidate duplicate RLS policies.
9. Add missing indexes for foreign keys and hot filters.
10. Pull the live schema into clean migrations so production can be reproduced.
11. Re-run Supabase security/performance advisors.
12. Run a two-account QA matrix:
   - signup/login/logout
   - onboarding
   - discovery
   - free swipes
   - premium standard swipes
   - Super Swipe
   - accept/decline request
   - chat
   - call notification
   - profile views
   - status/story upload
   - wallet deposit
   - premium purchase restore
