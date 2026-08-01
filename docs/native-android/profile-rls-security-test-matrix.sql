-- Profile RLS remediation verification matrix.
--
-- Do not paste real profile values into issue trackers or chat.
-- Replace the placeholder UUID values locally before running owner/non-owner
-- checks in a staging or approved test environment.
--
-- These checks should be run after applying the proposed migration to staging.
-- They are designed to return booleans/counts, not profile data.

-- 1. Anonymous checks.
begin;
set local role anon;

select
  'anon_profiles_select_grant_revoked' as check_name,
  not has_table_privilege('anon', 'public.profiles', 'SELECT') as pass;

select
  'anon_discovery_feed_v3_select_grant_revoked' as check_name,
  case
    when to_regclass('public.discovery_feed_v3') is null then true
    else not has_table_privilege('anon', 'public.discovery_feed_v3', 'SELECT')
  end as pass;

select
  'anon_leaderboard_unified_select_grant_revoked' as check_name,
  case
    when to_regclass('public.leaderboard_unified') is null then true
    else not has_table_privilege('anon', 'public.leaderboard_unified', 'SELECT')
  end as pass;

select
  'anon_optimized_confessions_select_grant_revoked' as check_name,
  case
    when to_regclass('public.optimized_confessions') is null then true
    else not has_table_privilege('anon', 'public.optimized_confessions', 'SELECT')
  end as pass;

rollback;

-- 2. Authenticated owner and non-owner checks.
-- Replace these UUID literals with approved staging test users.
begin;
set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001"}';

select
  'owner_can_read_own_profile' as check_name,
  exists (
    select 1
    from public.profiles
    where id = '00000000-0000-0000-0000-000000000001'::uuid
    limit 1
  ) as pass;

select
  'non_owner_direct_profile_read_strict_denial_deferred' as check_name,
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Authenticated users can read profiles for current app screens'
      and cmd = 'SELECT'
      and roles::text like '%authenticated%'
  ) as transitional_policy_present,
  'Known first-stage gap: direct authenticated non-owner profile reads are preserved until safe discovery/matched-profile contracts replace broad profile access.' as note;

with updated as (
  update public.profiles
  set updated_at = updated_at
  where id = '00000000-0000-0000-0000-000000000002'::uuid
  returning 1
)
select
  'non_owner_direct_profile_update_denied' as check_name,
  not exists (select 1 from updated) as pass;

rollback;

-- 3. Metadata checks. These do not read profile rows.
select
  c.relrowsecurity as profiles_rls_enabled,
  c.relforcerowsecurity as profiles_rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'profiles';

select
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'profiles'
order by policyname;

select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'profiles'
  and grantee in ('anon', 'authenticated', 'service_role')
order by grantee, privilege_type;
