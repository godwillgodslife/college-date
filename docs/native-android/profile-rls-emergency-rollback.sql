-- Emergency rollback for 20260801120000_restrict_anonymous_profile_access.sql.
--
-- Do not run this unless production approval is granted and a specific
-- compatibility incident requires restoring the previous public profile/view
-- access contract. This rollback deliberately re-opens broad anonymous access
-- and should be replaced with a narrower hotfix whenever possible.

alter table public.profiles enable row level security;

grant all on table public.profiles to anon;
grant all on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

drop policy if exists "Authenticated users can read profiles for current app screens" on public.profiles;
drop policy if exists "Users can delete own profile after account deletion request" on public.profiles;

drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone"
on public.profiles
for select
to public
using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles
for insert
to public
with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to public
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can delete own profile" on public.profiles;
create policy "Users can delete own profile"
on public.profiles
for delete
to public
using (auth.uid() = id);

do $$
begin
  if to_regclass('public.leaderboard_unified') is not null then
    execute 'alter view public.leaderboard_unified set (security_invoker = false)';
  end if;

  if to_regclass('public.discovery_feed_v3') is not null then
    execute 'grant all on table public.discovery_feed_v3 to anon';
    execute 'grant all on table public.discovery_feed_v3 to authenticated';
    execute 'grant all on table public.discovery_feed_v3 to service_role';
  end if;

  if to_regclass('public.leaderboard_unified') is not null then
    execute 'grant all on table public.leaderboard_unified to anon';
    execute 'grant all on table public.leaderboard_unified to authenticated';
    execute 'grant all on table public.leaderboard_unified to service_role';
  end if;

  if to_regclass('public.optimized_confessions') is not null then
    execute 'grant all on table public.optimized_confessions to anon';
    execute 'grant all on table public.optimized_confessions to authenticated';
    execute 'grant all on table public.optimized_confessions to service_role';
  end if;

  if to_regclass('public.leaderboard_big_spenders') is not null then
    execute 'grant all on table public.leaderboard_big_spenders to anon';
    execute 'grant all on table public.leaderboard_big_spenders to authenticated';
    execute 'grant all on table public.leaderboard_big_spenders to service_role';
  end if;

  if to_regclass('public.leaderboard_campus_stars') is not null then
    execute 'grant all on table public.leaderboard_campus_stars to anon';
    execute 'grant all on table public.leaderboard_campus_stars to authenticated';
    execute 'grant all on table public.leaderboard_campus_stars to service_role';
  end if;

  if to_regclass('public.leaderboard_most_wanted') is not null then
    execute 'grant all on table public.leaderboard_most_wanted to anon';
    execute 'grant all on table public.leaderboard_most_wanted to authenticated';
    execute 'grant all on table public.leaderboard_most_wanted to service_role';
  end if;
end $$;

comment on table public.profiles is null;

notify pgrst, 'reload schema';
