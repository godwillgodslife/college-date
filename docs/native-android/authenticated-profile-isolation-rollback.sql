-- Emergency rollback for 20260801163000_restrict_authenticated_profile_access.sql.
--
-- Staging-tested rollback target:
-- - Restores the first-stage transitional authenticated profile access contract.
-- - Does not restore anonymous profile or profile-derived view access.
-- - Deliberately re-opens broad authenticated SELECT on profiles for compatibility.

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon;
revoke all on table public.profiles from public;
revoke all on table public.profiles from authenticated;

grant select, insert, update, delete on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

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

grant select on table public.discovery_feed_v3 to authenticated;
grant select on table public.leaderboard_big_spenders to authenticated;
grant select on table public.leaderboard_campus_stars to authenticated;
grant select on table public.leaderboard_most_wanted to authenticated;
grant select on table public.leaderboard_unified to authenticated;
grant select on table public.optimized_confessions to authenticated;

grant all on table public.discovery_feed_v3 to service_role;
grant all on table public.leaderboard_big_spenders to service_role;
grant all on table public.leaderboard_campus_stars to service_role;
grant all on table public.leaderboard_most_wanted to service_role;
grant all on table public.leaderboard_unified to service_role;
grant all on table public.optimized_confessions to service_role;

alter view public.discovery_feed_v3 set (security_invoker = true);
alter view public.leaderboard_big_spenders set (security_invoker = true);
alter view public.leaderboard_campus_stars set (security_invoker = true);
alter view public.leaderboard_most_wanted set (security_invoker = true);
alter view public.leaderboard_unified set (security_invoker = true);
alter view public.optimized_confessions set (security_invoker = true);

revoke all on function public.get_matched_profile(uuid) from public, anon, authenticated;
drop function if exists public.get_matched_profile(uuid);

comment on table public.profiles is
  'Owner profile records are not readable by anonymous clients. Public dating/discovery profile data must be exposed only through reviewed authenticated views or RPCs.';

notify pgrst, 'reload schema';
