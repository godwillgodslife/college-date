-- Secure, idempotent referral-code validation and attribution.
-- This does not replace the existing referral rewards trigger; it gives
-- sign-up/OAuth a server-authoritative way to apply one referral code.

alter table public.profiles
    add column if not exists referral_code text;

alter table public.profiles
    add column if not exists referred_by uuid references public.profiles(id);

create table if not exists public.referrals (
    id uuid primary key default gen_random_uuid(),
    referrer_id uuid references public.profiles(id) on delete cascade,
    referred_id uuid references public.profiles(id) on delete cascade,
    status text default 'pending' check (status in ('pending', 'completed', 'rewarded')),
    reward_awarded boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.referrals
    add column if not exists reward_awarded boolean default false;

alter table public.referrals
    add column if not exists created_at timestamp with time zone default timezone('utc'::text, now()) not null;

create unique index if not exists profiles_referral_code_lower_unique
    on public.profiles (lower(referral_code))
    where referral_code is not null and btrim(referral_code) <> '';

create unique index if not exists referrals_referred_id_unique
    on public.referrals (referred_id);

create unique index if not exists referrals_referrer_referred_unique
    on public.referrals (referrer_id, referred_id);

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'profiles_no_self_referral'
          and conrelid = 'public.profiles'::regclass
    ) then
        alter table public.profiles
            add constraint profiles_no_self_referral
            check (referred_by is null or referred_by <> id);
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conname = 'referrals_no_self_referral'
          and conrelid = 'public.referrals'::regclass
    ) then
        alter table public.referrals
            add constraint referrals_no_self_referral
            check (referrer_id <> referred_id);
    end if;
end $$;

create or replace function public.normalize_referral_code(p_code text)
returns text
language sql
immutable
set search_path to ''
as $$
    select nullif(
        upper(regexp_replace(btrim(coalesce(p_code, '')), '[^A-Za-z0-9-]', '', 'g')),
        ''
    );
$$;

create or replace function public.validate_referral_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
    v_code text := public.normalize_referral_code(p_code);
    v_referrer record;
begin
    if v_code is null then
        return jsonb_build_object('valid', false, 'reason', 'empty_code', 'code', '');
    end if;

    select
        p.id,
        p.referral_code,
        p.full_name,
        p.username,
        coalesce(p.is_banned, false) as is_banned,
        coalesce(p.is_shadow_banned, false) as is_shadow_banned
    into v_referrer
    from public.profiles p
    where lower(p.referral_code) = lower(v_code)
    limit 1;

    if not found then
        return jsonb_build_object('valid', false, 'reason', 'not_found', 'code', v_code);
    end if;

    if v_referrer.is_banned or v_referrer.is_shadow_banned then
        return jsonb_build_object('valid', false, 'reason', 'inactive_referrer', 'code', v_code);
    end if;

    return jsonb_build_object(
        'valid', true,
        'reason', 'valid',
        'code', v_referrer.referral_code,
        'referrer_id', v_referrer.id,
        'referrer_name', coalesce(nullif(split_part(btrim(coalesce(v_referrer.full_name, '')), ' ', 1), ''), v_referrer.username, 'a student')
    );
end;
$$;

create or replace function public.apply_referral_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_code text := public.normalize_referral_code(p_code);
    v_profile record;
    v_referrer record;
    v_existing_referrer uuid;
begin
    if v_user_id is null then
        return jsonb_build_object('success', false, 'reason', 'not_authenticated');
    end if;

    if v_code is null then
        return jsonb_build_object('success', true, 'skipped', true, 'reason', 'empty_code');
    end if;

    select p.id, p.referred_by
    into v_profile
    from public.profiles p
    where p.id = v_user_id
    for update;

    if not found then
        return jsonb_build_object('success', false, 'reason', 'profile_missing');
    end if;

    select
        p.id,
        p.referral_code,
        p.full_name,
        p.username
    into v_referrer
    from public.profiles p
    where lower(p.referral_code) = lower(v_code)
      and coalesce(p.is_banned, false) = false
      and coalesce(p.is_shadow_banned, false) = false
    for update;

    if not found then
        return jsonb_build_object('success', false, 'reason', 'not_found', 'code', v_code);
    end if;

    if v_referrer.id = v_user_id then
        return jsonb_build_object('success', false, 'reason', 'self_referral', 'code', v_referrer.referral_code);
    end if;

    if v_profile.referred_by is not null then
        return jsonb_build_object(
            'success', v_profile.referred_by = v_referrer.id,
            'already_applied', true,
            'reason', 'already_applied',
            'code', v_referrer.referral_code,
            'referrer_id', v_profile.referred_by
        );
    end if;

    select r.referrer_id
    into v_existing_referrer
    from public.referrals r
    where r.referred_id = v_user_id
    for update;

    if v_existing_referrer is not null then
        update public.profiles
        set referred_by = v_existing_referrer
        where id = v_user_id
          and referred_by is null;

        return jsonb_build_object(
            'success', v_existing_referrer = v_referrer.id,
            'already_applied', true,
            'reason', 'already_applied',
            'code', v_referrer.referral_code,
            'referrer_id', v_existing_referrer
        );
    end if;

    update public.profiles
    set referred_by = v_referrer.id
    where id = v_user_id
      and referred_by is null;

    insert into public.referrals (referrer_id, referred_id, status)
    values (v_referrer.id, v_user_id, 'pending')
    on conflict (referred_id) do nothing;

    return jsonb_build_object(
        'success', true,
        'reason', 'applied',
        'code', v_referrer.referral_code,
        'referrer_id', v_referrer.id,
        'referrer_name', coalesce(nullif(split_part(btrim(coalesce(v_referrer.full_name, '')), ' ', 1), ''), v_referrer.username, 'a student')
    );
end;
$$;

create or replace function public.sync_referral_from_profile()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
    if new.referred_by is null or new.referred_by = new.id then
        return new;
    end if;

    if tg_op = 'UPDATE' and old.referred_by is not null then
        return new;
    end if;

    insert into public.referrals (referrer_id, referred_id, status)
    values (new.referred_by, new.id, 'pending')
    on conflict (referred_id) do nothing;

    return new;
end;
$$;

drop trigger if exists tr_sync_referral on public.profiles;
create trigger tr_sync_referral
    after insert or update of referred_by on public.profiles
    for each row execute function public.sync_referral_from_profile();

revoke all on function public.validate_referral_code(text) from public;
revoke all on function public.apply_referral_code(text) from public;
grant execute on function public.validate_referral_code(text) to anon, authenticated;
grant execute on function public.apply_referral_code(text) to authenticated;
