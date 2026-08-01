-- Restrict authenticated direct profile access and add safe matched-profile access.
--
-- Staging validation target: pxobauvatbjncluuunyq.
-- This migration is the second phase after
-- 20260801120000_restrict_anonymous_profile_access.sql.
--
-- Security model:
-- - Signed-in users can read only their own full profile through direct table RLS.
-- - Signed-in users cannot directly read full non-owner profile rows.
-- - Discovery must use get_discovery_profiles(...).
-- - Matched-profile reads must use get_matched_profile(...).
-- - Direct profile writes are column-limited so clients cannot update protected
--   Premium, wallet/quota, referral, moderation, notification-token, or AI-review
--   fields through PostgREST.

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon;
revoke all on table public.profiles from public;
revoke all on table public.profiles from authenticated;

grant select, delete on table public.profiles to authenticated;
grant insert (
    id,
    email,
    full_name,
    gender,
    age,
    university,
    bio,
    phone,
    avatar_url,
    photos,
    faculty,
    department,
    level,
    mbti,
    attraction_goal,
    interest_gender,
    intro_prompt,
    voice_intro_url,
    anthem,
    location_status,
    profile_photos,
    interests,
    is_onboarded
) on table public.profiles to authenticated;
grant update (
    full_name,
    gender,
    age,
    university,
    bio,
    phone,
    avatar_url,
    photos,
    faculty,
    department,
    level,
    mbti,
    attraction_goal,
    interest_gender,
    intro_prompt,
    voice_intro_url,
    anthem,
    location_status,
    profile_photos,
    interests,
    is_onboarded,
    is_online,
    is_live,
    last_seen,
    last_seen_at,
    last_active,
    updated_at
) on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

drop policy if exists "Authenticated users can read profiles for current app screens" on public.profiles;
drop policy if exists "Authenticated users can read own profile" on public.profiles;
drop policy if exists "Authenticated users can insert own profile" on public.profiles;
drop policy if exists "Authenticated users can update own profile" on public.profiles;
drop policy if exists "Authenticated users can delete own profile" on public.profiles;
drop policy if exists "Users can insert own profile during onboarding" on public.profiles;
drop policy if exists "Users can update own profile during onboarding" on public.profiles;
drop policy if exists "Users can read own profile during onboarding" on public.profiles;
drop policy if exists "Users can delete own profile after account deletion request" on public.profiles;
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can delete own profile" on public.profiles;

create policy "Authenticated users can read own profile"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

create policy "Authenticated users can insert own profile"
on public.profiles
for insert
to authenticated
with check (id = (select auth.uid()));

create policy "Authenticated users can update own profile"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "Authenticated users can delete own profile"
on public.profiles
for delete
to authenticated
using (id = (select auth.uid()));

revoke all on table public.discovery_feed_v3 from anon, public, authenticated;
revoke all on table public.leaderboard_big_spenders from anon, public, authenticated;
revoke all on table public.leaderboard_campus_stars from anon, public, authenticated;
revoke all on table public.leaderboard_most_wanted from anon, public, authenticated;
revoke all on table public.leaderboard_unified from anon, public, authenticated;
revoke all on table public.optimized_confessions from anon, public, authenticated;

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

create or replace function public.get_matched_profile(p_profile_id uuid)
returns table (
    id uuid,
    full_name text,
    username text,
    gender text,
    age integer,
    university text,
    faculty text,
    department text,
    level text,
    bio text,
    avatar_url text,
    photos text[],
    profile_photos text[],
    interests jsonb,
    intro_prompt text,
    voice_intro_url text,
    anthem text,
    attraction_goal text,
    is_verified boolean,
    completion_score integer,
    last_seen_at timestamp with time zone,
    last_active timestamp with time zone,
    is_live boolean
)
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
begin
    if v_user_id is null then
        raise exception 'not_authenticated';
    end if;

    if p_profile_id is null or p_profile_id = v_user_id then
        raise exception 'invalid_profile';
    end if;

    return query
    select
        p.id,
        p.full_name,
        p.username,
        p.gender,
        p.age,
        p.university,
        p.faculty,
        p.department,
        p.level,
        p.bio,
        p.avatar_url,
        p.photos,
        p.profile_photos,
        p.interests,
        p.intro_prompt,
        p.voice_intro_url,
        p.anthem,
        p.attraction_goal,
        coalesce(p.is_verified, false) as is_verified,
        coalesce(p.completion_score, 0) as completion_score,
        p.last_seen_at,
        p.last_active,
        coalesce(p.last_active, p.last_seen_at) > now() - interval '15 minutes' as is_live
    from public.profiles p
    where p.id = p_profile_id
      and coalesce(p.is_banned, false) = false
      and coalesce(p.is_shadow_banned, false) = false
      and coalesce(p.is_blocked, false) = false
      and coalesce(p.incognito_mode, false) = false
      and exists (
          select 1
          from public.matches m
          where m.user_ids @> array[v_user_id, p_profile_id]::uuid[]
      )
      and not exists (
          select 1
          from public.reports r
          where (
              (r.reporter_id = v_user_id and r.reported_id = p_profile_id)
              or (r.reporter_id = p_profile_id and r.reported_id = v_user_id)
          )
          and coalesce(r.status, 'pending') <> 'dismissed'
      );
end;
$$;

revoke all on function public.get_matched_profile(uuid) from public, anon, authenticated;
grant execute on function public.get_matched_profile(uuid) to authenticated;

comment on function public.get_matched_profile(uuid) is
  'Returns a safe display profile for another user only when the authenticated caller is matched with that profile. Does not expose email, phone, push identifiers, wallet, referral, notification, moderation, AI-review, or admin fields.';

comment on table public.profiles is
  'Direct profile access is owner-only for authenticated clients. Discovery and matched-profile reads must use reviewed RPC contracts.';

notify pgrst, 'reload schema';
