-- Restrict anonymous profile and profile-derived discovery access.
--
-- Security model for this migration:
-- - Anonymous clients must not read rows directly from public.profiles.
-- - Anonymous clients must not read profile-derived app views used by logged-in
--   product screens.
-- - Authenticated users retain owner profile read/write/delete access required
--   for login hydration, onboarding, profile editing, and account deletion.
-- - Existing authenticated discovery behavior is preserved through a temporary
--   authenticated-only SELECT policy. This is intentionally transitional until
--   a dedicated safe discovery RPC/view is reviewed and adopted.
-- - Profile-derived views must not be anonymously readable. Postgres 15+
--   views should be security_invoker where they depend on underlying RLS.
-- - This migration intentionally does not change SECURITY DEFINER RPC grants
--   found during production inspection. Payment, wallet, notification,
--   entitlement, and profile helper RPCs need a separate reviewed hardening
--   migration with product-flow testing and rollback.
--
-- This migration is intentionally not applied automatically by the native
-- Android remediation task.

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon;
revoke all on table public.profiles from public;

grant select, insert, update, delete on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can delete own profile" on public.profiles;

drop policy if exists "Authenticated users can read profiles for current app screens" on public.profiles;
create policy "Authenticated users can read profiles for current app screens"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "Users can insert own profile during onboarding" on public.profiles;
create policy "Users can insert own profile during onboarding"
on public.profiles
for insert
to authenticated
with check (id = (select auth.uid()));

drop policy if exists "Users can update own profile during onboarding" on public.profiles;
create policy "Users can update own profile during onboarding"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "Users can read own profile during onboarding" on public.profiles;
create policy "Users can read own profile during onboarding"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

drop policy if exists "Users can delete own profile after account deletion request" on public.profiles;
create policy "Users can delete own profile after account deletion request"
on public.profiles
for delete
to authenticated
using (id = (select auth.uid()));

do $$
begin
  if to_regclass('public.discovery_feed_v3') is not null then
    execute 'revoke all on table public.discovery_feed_v3 from anon';
    execute 'revoke all on table public.discovery_feed_v3 from public';
    execute 'revoke all on table public.discovery_feed_v3 from authenticated';
    execute 'grant select on table public.discovery_feed_v3 to authenticated';
    execute 'grant all on table public.discovery_feed_v3 to service_role';
  end if;

  if to_regclass('public.leaderboard_unified') is not null then
    execute 'alter view public.leaderboard_unified set (security_invoker = true)';
    execute 'revoke all on table public.leaderboard_unified from anon';
    execute 'revoke all on table public.leaderboard_unified from public';
    execute 'revoke all on table public.leaderboard_unified from authenticated';
    execute 'grant select on table public.leaderboard_unified to authenticated';
    execute 'grant all on table public.leaderboard_unified to service_role';
  end if;

  if to_regclass('public.optimized_confessions') is not null then
    execute 'revoke all on table public.optimized_confessions from anon';
    execute 'revoke all on table public.optimized_confessions from public';
    execute 'revoke all on table public.optimized_confessions from authenticated';
    execute 'grant select on table public.optimized_confessions to authenticated';
    execute 'grant all on table public.optimized_confessions to service_role';
  end if;

  if to_regclass('public.leaderboard_big_spenders') is not null then
    execute 'revoke all on table public.leaderboard_big_spenders from anon';
    execute 'revoke all on table public.leaderboard_big_spenders from public';
    execute 'revoke all on table public.leaderboard_big_spenders from authenticated';
    execute 'grant select on table public.leaderboard_big_spenders to authenticated';
    execute 'grant all on table public.leaderboard_big_spenders to service_role';
  end if;

  if to_regclass('public.leaderboard_campus_stars') is not null then
    execute 'revoke all on table public.leaderboard_campus_stars from anon';
    execute 'revoke all on table public.leaderboard_campus_stars from public';
    execute 'revoke all on table public.leaderboard_campus_stars from authenticated';
    execute 'grant select on table public.leaderboard_campus_stars to authenticated';
    execute 'grant all on table public.leaderboard_campus_stars to service_role';
  end if;

  if to_regclass('public.leaderboard_most_wanted') is not null then
    execute 'revoke all on table public.leaderboard_most_wanted from anon';
    execute 'revoke all on table public.leaderboard_most_wanted from public';
    execute 'revoke all on table public.leaderboard_most_wanted from authenticated';
    execute 'grant select on table public.leaderboard_most_wanted to authenticated';
    execute 'grant all on table public.leaderboard_most_wanted to service_role';
  end if;
end $$;

comment on table public.profiles is
  'Owner profile records are not readable by anonymous clients. Public dating/discovery profile data must be exposed only through reviewed authenticated views or RPCs.';

notify pgrst, 'reload schema';
