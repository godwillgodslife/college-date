-- The College Date staging schema baseline
-- Source: production metadata from Supabase project gedoyoleoscgxgdqszzc on 2026-08-01.
-- Scope: schema structure only. Do not add production data, auth.users rows, secrets, or owner-specific grants.
-- Review status: untrusted generated baseline candidate. Apply only to an empty staging project after review.

set check_function_bodies = off;

create schema if not exists extensions;

-- Required by production table defaults and helper functions.
-- Do not pin extension versions; Supabase extension versions are managed by the platform.
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

-- Fresh staging projects may contain a platform/demo event-trigger helper that
-- advisors flag because clients inherit public EXECUTE on SECURITY DEFINER
-- functions. Keep the helper if present, but remove client-callable access.
do $$
begin
    if to_regprocedure('public.rls_auto_enable()') is not null then
        revoke all on function public.rls_auto_enable() from public, anon, authenticated;
    end if;
end $$;

-- Production also has pg_stat_statements in schema extensions. It is platform telemetry,
-- not required for application reconstruction, so it is not created by this app baseline.

-- Production has supabase_vault installed in schema vault. Vault contents, provider
-- credentials, and secrets are intentionally excluded from this baseline.

-- Production currently has pg_net installed in public. Supabase security advisors flag
-- extensions in exposed schemas, so this baseline does not reproduce pg_net in public.
-- Any future database HTTP hook should be reviewed and installed in a non-exposed schema.

-- Production metadata inspection found no custom public enum, domain, or composite types.
