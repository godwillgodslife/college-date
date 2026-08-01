-- The College Date staging schema baseline
-- Source: production metadata from Supabase project gedoyoleoscgxgdqszzc on 2026-08-01.
-- Scope: staging-safe RLS and grants.
--
-- Security decision:
-- Production has 121 public-table RLS policies and broad table/view grants to anon
-- and authenticated roles. It also still has the insecure policy
-- "Public profiles are viewable by everyone" on public.profiles.
-- This baseline intentionally does not reproduce that policy.

set search_path = public, extensions;

alter table public.admin_audit_logs enable row level security;
alter table public.admin_push_broadcasts enable row level security;
alter table public.ai_interactions enable row level security;
alter table public.ai_profile_reviews enable row level security;
alter table public.app_config enable row level security;
alter table public.boosts enable row level security;
alter table public.confession_claims enable row level security;
alter table public.confession_comments enable row level security;
alter table public.confession_reactions enable row level security;
alter table public.confession_reports enable row level security;
alter table public.confessions enable row level security;
alter table public.conversations enable row level security;
alter table public.direct_snaps enable row level security;
alter table public.engagement_scores enable row level security;
alter table public.entitlements enable row level security;
alter table public.feed_impressions enable row level security;
alter table public.gifts enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;
alter table public.monetization_config enable row level security;
alter table public.notifications enable row level security;
alter table public.paid_products enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.payment_audit_logs enable row level security;
alter table public.payout_details enable row level security;
alter table public.profile_views enable row level security;
alter table public.profiles enable row level security;
alter table public.promo_codes enable row level security;
alter table public.provider_webhook_events enable row level security;
alter table public.referrals enable row level security;
alter table public.reports enable row level security;
alter table public.snapshots enable row level security;
alter table public.status_updates enable row level security;
alter table public.status_views enable row level security;
alter table public.statuses enable row level security;
alter table public.subscriptions enable row level security;
alter table public.swipe_limits enable row level security;
alter table public.swipe_payment_operations enable row level security;
alter table public.swipes enable row level security;
alter table public.transactions enable row level security;
alter table public.user_notification_devices enable row level security;
alter table public.user_settings enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.wallets enable row level security;
alter table public.withdrawal_requests enable row level security;
alter table public.withdrawals enable row level security;

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

grant usage on schema public to anon, authenticated;

-- Public, non-personal configuration surfaces. Confirm values separately;
-- production rows are not copied by this baseline.
grant select on public.app_config to anon, authenticated;
grant select on public.gifts to anon, authenticated;
grant select on public.monetization_config to anon, authenticated;
grant select on public.paid_products to anon, authenticated;

create policy "Public can read app config"
on public.app_config for select
to anon, authenticated
using (true);

create policy "Public can read gifts"
on public.gifts for select
to anon, authenticated
using (true);

create policy "Public can read monetization config"
on public.monetization_config for select
to anon, authenticated
using (true);

create policy "Public can read paid products"
on public.paid_products for select
to anon, authenticated
using (true);

-- Current-user profile and onboarding. This intentionally replaces production's
-- anonymous public profile policy for staging.
grant select, insert, update, delete on public.profiles to authenticated;

create policy "Authenticated users can read own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "Authenticated users can insert own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Authenticated users can update own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Authenticated users can delete own profile"
on public.profiles for delete
to authenticated
using ((select auth.uid()) = id);

grant select, insert, update, delete on public.user_settings to authenticated;

create policy "Users can manage own settings"
on public.user_settings for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select on public.subscriptions to authenticated;

create policy "Users can read own subscription"
on public.subscriptions for select
to authenticated
using ((select auth.uid()) = user_id);

grant select on public.entitlements to authenticated;

create policy "Users can read own entitlements"
on public.entitlements for select
to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update on public.user_notification_devices to authenticated;

create policy "Users can view own notification devices"
on public.user_notification_devices for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own notification devices"
on public.user_notification_devices for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own notification devices"
on public.user_notification_devices for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select on public.wallets to authenticated;

create policy "Users can read own wallet"
on public.wallets for select
to authenticated
using ((select auth.uid()) = user_id);

grant select on public.wallet_transactions to authenticated;

create policy "Users can read own wallet transactions"
on public.wallet_transactions for select
to authenticated
using ((select auth.uid()) = user_id);

grant select on public.wallet_ledger to authenticated;

create policy "Users can read own wallet ledger"
on public.wallet_ledger for select
to authenticated
using ((select auth.uid()) = user_id);

grant select on public.ai_interactions to authenticated;

create policy "Users can view own ai interactions"
on public.ai_interactions for select
to authenticated
using ((select auth.uid()) = user_id);

grant select on public.ai_profile_reviews to authenticated;

create policy "Users can view own ai reviews"
on public.ai_profile_reviews for select
to authenticated
using ((select auth.uid()) = user_id);

-- Views are security_invoker in 040_views.sql. Grant authenticated reads only;
-- anon access is intentionally withheld until profile-card privacy is redesigned.
revoke all on public.discovery_feed_v3 from anon, authenticated;
revoke all on public.leaderboard_big_spenders from anon, authenticated;
revoke all on public.leaderboard_campus_stars from anon, authenticated;
revoke all on public.leaderboard_most_wanted from anon, authenticated;
revoke all on public.leaderboard_unified from anon, authenticated;
revoke all on public.optimized_confessions from anon, authenticated;

grant select on public.discovery_feed_v3 to authenticated;
grant select on public.leaderboard_big_spenders to authenticated;
grant select on public.leaderboard_campus_stars to authenticated;
grant select on public.leaderboard_most_wanted to authenticated;
grant select on public.leaderboard_unified to authenticated;
grant select on public.optimized_confessions to authenticated;

-- Deferred:
-- The remaining production RLS policies and broad table grants must be rebuilt from
-- reviewed migrations or redesigned before feature testing. Do not restore broad anon
-- grants or production's public profile policy into staging.
