create schema if not exists rollback_20260725_payment_remediation;

create table if not exists rollback_20260725_payment_remediation.snapshot_manifest (
    key text primary key,
    value jsonb not null,
    captured_at timestamptz not null default now()
);

create table if not exists rollback_20260725_payment_remediation.profiles
as select * from public.profiles;

create table if not exists rollback_20260725_payment_remediation.subscriptions
as select * from public.subscriptions;

create table if not exists rollback_20260725_payment_remediation.wallets
as select * from public.wallets;

create table if not exists rollback_20260725_payment_remediation.wallet_transactions
as select * from public.wallet_transactions;

create table if not exists rollback_20260725_payment_remediation.transactions
as select * from public.transactions;

create table if not exists rollback_20260725_payment_remediation.boosts
as select * from public.boosts;

create table if not exists rollback_20260725_payment_remediation.schema_columns
as
select *
from information_schema.columns
where table_schema = 'public';

create table if not exists rollback_20260725_payment_remediation.table_constraints
as
select *
from information_schema.table_constraints
where table_schema = 'public';

create table if not exists rollback_20260725_payment_remediation.key_column_usage
as
select *
from information_schema.key_column_usage
where table_schema = 'public';

create table if not exists rollback_20260725_payment_remediation.constraint_column_usage
as
select *
from information_schema.constraint_column_usage
where table_schema = 'public';

create table if not exists rollback_20260725_payment_remediation.policies
as
select *
from pg_policies
where schemaname = 'public';

create table if not exists rollback_20260725_payment_remediation.indexes
as
select *
from pg_indexes
where schemaname = 'public';

create table if not exists rollback_20260725_payment_remediation.functions
as
select
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as identity_arguments,
    pg_get_function_result(p.oid) as function_result,
    pg_get_functiondef(p.oid) as function_definition,
    p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public';

create table if not exists rollback_20260725_payment_remediation.migration_history
as
select *
from supabase_migrations.schema_migrations;

insert into rollback_20260725_payment_remediation.snapshot_manifest(key, value)
values
    ('approved_by_user', jsonb_build_object(
        'approved', true,
        'approval_text', 'I approve proceeding on the Supabase Free plan using manual logical backups instead of managed Supabase backups.'
    )),
    ('captured_at', jsonb_build_object('database_now', now())),
    ('row_counts', jsonb_build_object(
        'profiles', (select count(*) from rollback_20260725_payment_remediation.profiles),
        'subscriptions', (select count(*) from rollback_20260725_payment_remediation.subscriptions),
        'wallets', (select count(*) from rollback_20260725_payment_remediation.wallets),
        'wallet_transactions', (select count(*) from rollback_20260725_payment_remediation.wallet_transactions),
        'transactions', (select count(*) from rollback_20260725_payment_remediation.transactions),
        'boosts', (select count(*) from rollback_20260725_payment_remediation.boosts)
    )),
    ('premium_counts', jsonb_build_object(
        'profile_is_premium', (select count(*) from rollback_20260725_payment_remediation.profiles where is_premium = true),
        'profile_active_premium', (
            select count(*)
            from rollback_20260725_payment_remediation.profiles
            where is_premium = true
              and (premium_expires_at is null or premium_expires_at > now())
        ),
        'premium_subscriptions', (
            select count(*)
            from rollback_20260725_payment_remediation.subscriptions
            where plan_type = 'Premium'
        ),
        'active_premium_subscriptions', (
            select count(*)
            from rollback_20260725_payment_remediation.subscriptions
            where plan_type = 'Premium'
              and status = 'active'
              and (current_period_end is null or current_period_end > now())
        )
    ))
on conflict (key) do update
set value = excluded.value,
    captured_at = now();
