-- The College Date profile RLS live inspection.
--
-- Purpose:
--   Capture policy, grant, view, and function metadata needed to validate
--   anonymous profile-access remediation.
--
-- Safety:
--   This script is read-only. It does not select rows from public.profiles or
--   any user-content table. It only reads PostgreSQL catalog and
--   information_schema metadata.
--
-- How to run:
--   Run the whole script in the Supabase SQL Editor for the College Date
--   project, then export/copy every result set.

begin transaction read only;

-- 1. RLS status for public.profiles.
select
  'profiles_rls_status' as section,
  n.nspname as schema_name,
  c.relname as object_name,
  c.relkind as object_kind,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced,
  pg_catalog.pg_get_userbyid(c.relowner) as owner
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'profiles';

-- 2. All policies on public.profiles.
select
  'profiles_policies' as section,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename = 'profiles'
order by policyname, cmd;

-- 3. Grants on profile and profile-derived surfaces.
with target_objects(schema_name, object_name) as (
  values
    ('public', 'profiles'),
    ('public', 'discovery_feed_v3'),
    ('public', 'leaderboard_unified'),
    ('public', 'optimized_confessions')
)
select
  'target_table_view_grants' as section,
  t.schema_name,
  t.object_name,
  c.relkind as object_kind,
  g.grantee,
  g.privilege_type,
  g.is_grantable
from target_objects t
left join pg_catalog.pg_class c
  on c.relname = t.object_name
left join pg_catalog.pg_namespace n
  on n.oid = c.relnamespace
 and n.nspname = t.schema_name
left join information_schema.role_table_grants g
  on g.table_schema = t.schema_name
 and g.table_name = t.object_name
where c.oid is not null
order by t.object_name, g.grantee, g.privilege_type;

-- 4. View owners, definitions, and security_invoker state.
with target_views(schema_name, view_name) as (
  values
    ('public', 'discovery_feed_v3'),
    ('public', 'leaderboard_unified'),
    ('public', 'optimized_confessions')
)
select
  'target_view_definitions' as section,
  tv.schema_name,
  tv.view_name,
  pg_catalog.pg_get_userbyid(c.relowner) as view_owner,
  c.reloptions,
  coalesce((
    select lower(o.option_value) = 'true'
    from pg_catalog.pg_options_to_table(c.reloptions) o
    where o.option_name = 'security_invoker'
    limit 1
  ), false) as security_invoker,
  pg_catalog.pg_get_viewdef(c.oid, true) as view_definition
from target_views tv
join pg_catalog.pg_class c
  on c.relname = tv.view_name
join pg_catalog.pg_namespace n
  on n.oid = c.relnamespace
 and n.nspname = tv.schema_name
where c.relkind in ('v', 'm')
order by tv.view_name;

-- 5. Direct object dependencies for the target views.
with target_views as (
  select c.oid, n.nspname as schema_name, c.relname as view_name
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('discovery_feed_v3', 'leaderboard_unified', 'optimized_confessions')
    and c.relkind in ('v', 'm')
)
select distinct
  'target_view_dependencies' as section,
  tv.schema_name,
  tv.view_name,
  dep_ns.nspname as referenced_schema,
  dep_cls.relname as referenced_object,
  dep_cls.relkind as referenced_kind
from target_views tv
join pg_catalog.pg_depend d
  on d.objid = tv.oid
join pg_catalog.pg_rewrite r
  on r.oid = d.objid
join pg_catalog.pg_depend rd
  on rd.objid = r.oid
join pg_catalog.pg_class dep_cls
  on dep_cls.oid = rd.refobjid
join pg_catalog.pg_namespace dep_ns
  on dep_ns.oid = dep_cls.relnamespace
where dep_cls.oid <> tv.oid
order by tv.view_name, referenced_schema, referenced_object;

-- 6. Functions that appear related to profile, discovery, leaderboard, or
-- confession access. This intentionally does not output function bodies.
with function_catalog as (
  select
    p.oid,
    n.nspname as schema_name,
    p.proname as function_name,
    pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_arguments,
    pg_catalog.pg_get_function_result(p.oid) as return_type,
    pg_catalog.pg_get_userbyid(p.proowner) as function_owner,
    p.prosecdef as security_definer,
    p.provolatile as volatility,
    p.proleakproof as leakproof,
    p.proconfig as function_config,
    p.proacl as function_acl,
    lower(coalesce(p.proname, '') || ' ' || coalesce(p.prosrc, '')) as searchable_text
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'auth', 'storage')
)
select
  'access_related_functions' as section,
  schema_name,
  function_name,
  identity_arguments,
  return_type,
  function_owner,
  security_definer,
  volatility,
  leakproof,
  function_config,
  function_acl,
  array_remove(array[
    case when searchable_text like '%profiles%' then 'profiles' end,
    case when searchable_text like '%discovery_feed_v3%' then 'discovery_feed_v3' end,
    case when searchable_text like '%leaderboard_unified%' then 'leaderboard_unified' end,
    case when searchable_text like '%optimized_confessions%' then 'optimized_confessions' end,
    case when searchable_text like '%confessions%' then 'confessions' end,
    case when searchable_text like '%confession_reactions%' then 'confession_reactions' end,
    case when searchable_text like '%confession_claims%' then 'confession_claims' end,
    case when searchable_text like '%profile_views%' then 'profile_views' end,
    case when searchable_text like '%swipes%' then 'swipes' end,
    case when searchable_text like '%matches%' then 'matches' end,
    case when searchable_text like '%wallets%' then 'wallets' end
  ], null) as matched_terms
from function_catalog
where searchable_text like any (array[
  '%profiles%',
  '%discovery_feed_v3%',
  '%leaderboard_unified%',
  '%optimized_confessions%',
  '%confessions%',
  '%confession_reactions%',
  '%confession_claims%',
  '%profile_views%',
  '%swipes%',
  '%matches%',
  '%wallets%'
])
order by schema_name, function_name, identity_arguments;

-- 7. SECURITY DEFINER functions in exposed/common schemas.
select
  'security_definer_functions' as section,
  n.nspname as schema_name,
  p.proname as function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_arguments,
  pg_catalog.pg_get_function_result(p.oid) as return_type,
  pg_catalog.pg_get_userbyid(p.proowner) as function_owner,
  p.proconfig as function_config,
  p.proacl as function_acl
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where p.prosecdef = true
  and n.nspname in ('public', 'auth', 'storage')
order by n.nspname, p.proname, identity_arguments;

-- 8. EXECUTE grants for access-related and SECURITY DEFINER functions.
with target_functions as (
  select
    p.oid,
    n.nspname as schema_name,
    p.proname as function_name,
    pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_arguments
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'auth', 'storage')
    and (
      p.prosecdef = true
      or lower(coalesce(p.proname, '') || ' ' || coalesce(p.prosrc, '')) like any (array[
        '%profiles%',
        '%discovery_feed_v3%',
        '%leaderboard_unified%',
        '%optimized_confessions%',
        '%confessions%',
        '%confession_reactions%',
        '%confession_claims%',
        '%profile_views%',
        '%swipes%',
        '%matches%',
        '%wallets%'
      ])
    )
)
select
  'target_function_execute_grants' as section,
  tf.schema_name,
  tf.function_name,
  tf.identity_arguments,
  rp.grantee,
  rp.privilege_type,
  rp.is_grantable
from target_functions tf
left join information_schema.routine_privileges rp
  on rp.specific_schema = tf.schema_name
 and rp.routine_name = tf.function_name
where rp.privilege_type = 'EXECUTE'
   or rp.privilege_type is null
order by tf.schema_name, tf.function_name, tf.identity_arguments, rp.grantee;

-- 9. PostgREST/Data API related role settings and exposed schema clues.
select
  'postgrest_current_settings' as section,
  setting_name,
  setting_value
from (
  values
    ('pgrst.db_schemas', current_setting('pgrst.db_schemas', true)),
    ('pgrst.db_schema', current_setting('pgrst.db_schema', true)),
    ('pgrst.db_extra_search_path', current_setting('pgrst.db_extra_search_path', true)),
    ('pgrst.db_pre_request', current_setting('pgrst.db_pre_request', true))
) as s(setting_name, setting_value)
where setting_value is not null
order by setting_name;

select
  'postgrest_role_settings' as section,
  r.rolname as role_name,
  d.datname as database_name,
  unnest(rs.setconfig) as setting
from pg_catalog.pg_db_role_setting rs
left join pg_catalog.pg_roles r on r.oid = rs.setrole
left join pg_catalog.pg_database d on d.oid = rs.setdatabase
where rs.setconfig::text ilike '%pgrst%'
   or rs.setconfig::text ilike '%postgrest%'
order by r.rolname, d.datname, setting;

-- 10. Schema-level privileges for roles commonly exposed through Supabase APIs.
select
  'schema_privileges' as section,
  n.nspname as schema_name,
  r.rolname as role_name,
  has_schema_privilege(r.rolname, n.oid, 'USAGE') as has_usage,
  n.nspacl as schema_acl
from pg_catalog.pg_namespace n
cross join pg_catalog.pg_roles r
where n.nspname in ('public', 'auth', 'storage', 'graphql_public')
  and r.rolname in ('anon', 'authenticated', 'service_role', 'authenticator')
order by n.nspname, r.rolname;

rollback;
