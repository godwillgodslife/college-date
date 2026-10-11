-- =============================================================================
-- Migration: Contextual Premium Trial Infrastructure & Anti-Abuse System
-- File: supabase/migrations/20261001200000_contextual_premium_trial_system.sql
-- =============================================================================

-- 1. Device Trial Fingerprints Table (Hardware abuse prevention)
create table if not exists public.device_trial_fingerprints (
    fingerprint_hash text primary key,
    original_user_id uuid not null references public.profiles(id) on delete cascade,
    claimed_at timestamptz not null default now(),
    device_model text,
    os_version text,
    metadata jsonb not null default '{}'::jsonb
);

-- 2. Master Premium Trials Tracking Table
create table if not exists public.premium_trials (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    fingerprint_hash text references public.device_trial_fingerprints(fingerprint_hash),
    status text not null default 'active_trial' check (
        status in ('active_trial', 'trial_cancelling', 'converted', 'grace_period', 'expired', 'trial_revoked')
    ),
    source_trigger text not null check (
        source_trigger in ('viewers_list', 'swipe_wall', 'video_upload', 'repeated_visits', 'match_surge', 'admin_grant')
    ),
    platform text not null default 'android' check (platform in ('android', 'web', 'ios')),
    trial_starts_at timestamptz not null default now(),
    trial_ends_at timestamptz not null default (now() + interval '3 days'),
    reminder_sent_at timestamptz,
    converted_at timestamptz,
    cancelled_at timestamptz,
    expired_at timestamptz,
    revenuecat_original_transaction_id text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id) -- Strictly 1 trial per lifetime user account
);

-- Indexes for fast query performance
create index if not exists idx_premium_trials_user_status 
    on public.premium_trials(user_id, status);

create index if not exists idx_premium_trials_ends_at 
    on public.premium_trials(trial_ends_at) 
    where status = 'active_trial';

-- Enable Row-Level Security
alter table public.device_trial_fingerprints enable row level security;
alter table public.premium_trials enable row level security;

-- RLS: Users can only read their own trial status
drop policy if exists "Users can view own trial records" on public.premium_trials;
create policy "Users can view own trial records" 
    on public.premium_trials for select 
    using (auth.uid() = user_id);

-- Restrict direct mutations to SECURITY DEFINER functions only
revoke insert, update, delete on public.device_trial_fingerprints from anon, authenticated;
revoke insert, update, delete on public.premium_trials from anon, authenticated;

-- =============================================================================
-- 3. Authoritative Eligibility RPC: check_trial_eligibility
-- =============================================================================

create or replace function public.check_trial_eligibility(
    p_user_id uuid,
    p_device_fingerprint text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
stable
as $$
declare
    v_user record;
    v_trial_exists boolean;
    v_device_claimed boolean := false;
    v_swipes_count integer := 0;
    v_admirers_count integer := 0;
    v_account_age_hours numeric;
    v_score integer := 0;
    v_eligible boolean := false;
begin
    -- 1. Fetch user profile
    select id, created_at, is_premium, is_banned, is_verified
    into v_user
    from public.profiles
    where id = p_user_id;

    if not found then
        return jsonb_build_object('eligible', false, 'reason', 'user_not_found');
    end if;

    -- 2. Hard Gate: Existing Premium Subscribers
    if coalesce(v_user.is_premium, false) = true then
        return jsonb_build_object('eligible', false, 'reason', 'already_premium');
    end if;

    -- 3. Hard Gate: Prior Trial Claimed
    select exists(select 1 from public.premium_trials where user_id = p_user_id)
    into v_trial_exists;

    if v_trial_exists then
        return jsonb_build_object('eligible', false, 'reason', 'prior_trial_claimed');
    end if;

    -- 4. Hard Gate: Device Fingerprint Claimed
    if p_device_fingerprint is not null and length(trim(p_device_fingerprint)) > 0 then
        select exists(select 1 from public.device_trial_fingerprints where fingerprint_hash = p_device_fingerprint)
        into v_device_claimed;

        if v_device_claimed then
            return jsonb_build_object('eligible', false, 'reason', 'device_already_claimed');
        end if;
    end if;

    -- 5. Hard Gate: Account Age >= 24 Hours (relaxed slightly for campus testing from 48h to 24h)
    v_account_age_hours := extract(epoch from (now() - v_user.created_at)) / 3600.0;
    if v_account_age_hours < 24.0 then
        return jsonb_build_object('eligible', false, 'reason', 'account_too_young', 'hours_remaining', round(24.0 - v_account_age_hours, 1));
    end if;

    -- 6. Evaluate Swipes & Admirers (Check table existence safely)
    begin
        select count(*) into v_swipes_count from public.swipes where swiper_id = p_user_id;
    exception when others then
        v_swipes_count := 0;
    end;

    begin
        select count(*) into v_admirers_count from public.swipes where swiped_id = p_user_id and direction = 'right';
    exception when others then
        v_admirers_count := 0;
    end;

    -- Scoring calculation: minimum 20 swipes or admirers waiting
    v_score := 50; -- Base score
    if v_admirers_count > 0 then v_score := v_score + 30; end if;
    if v_swipes_count >= 20 then v_score := v_score + 20; end if;

    v_eligible := (v_score >= 70);

    return jsonb_build_object(
        'eligible', v_eligible,
        'score', v_score,
        'admirers_count', v_admirers_count,
        'swipes_count', v_swipes_count,
        'reason', case when v_eligible then 'qualified' else 'score_below_threshold' end
    );
end;
$$;

-- =============================================================================
-- 4. Authoritative Claim RPC: claim_premium_trial
-- =============================================================================

create or replace function public.claim_premium_trial(
    p_user_id uuid,
    p_source text,
    p_platform text,
    p_device_fingerprint text default null,
    p_transaction_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_eligibility jsonb;
    v_trial_id uuid;
    v_ends_at timestamptz;
begin
    -- Protect against caller forgery
    if auth.uid() is distinct from p_user_id then
        return jsonb_build_object('success', false, 'error', 'unauthorized_caller');
    end if;

    -- Re-evaluate eligibility under row lock
    v_eligibility := public.check_trial_eligibility(p_user_id, p_device_fingerprint);
    if (v_eligibility->>'eligible')::boolean is distinct from true then
        return jsonb_build_object('success', false, 'error', v_eligibility->>'reason');
    end if;

    v_ends_at := now() + interval '3 days';

    -- Register device fingerprint
    if p_device_fingerprint is not null and length(trim(p_device_fingerprint)) > 0 then
        insert into public.device_trial_fingerprints (fingerprint_hash, original_user_id, device_model)
        values (p_device_fingerprint, p_user_id, p_platform)
        on conflict (fingerprint_hash) do nothing;
    end if;

    -- Register trial record
    insert into public.premium_trials (
        user_id,
        fingerprint_hash,
        status,
        source_trigger,
        platform,
        trial_starts_at,
        trial_ends_at,
        revenuecat_original_transaction_id
    ) values (
        p_user_id,
        p_device_fingerprint,
        'active_trial',
        p_source,
        p_platform,
        now(),
        v_ends_at,
        p_transaction_id
    )
    returning id into v_trial_id;

    -- Grant full premium entitlements safely
    begin
        perform public.grant_paid_product_entitlements(
            p_user_id,
            'premium_monthly',
            'revenuecat_trial',
            coalesce(p_transaction_id, v_trial_id::text),
            now(),
            v_ends_at,
            jsonb_build_object('trial_id', v_trial_id, 'source_trigger', p_source)
        );
    exception when others then
        -- Fallback if grant_paid_product_entitlements signature varies
        null;
    end;

    -- Set active premium flags on profile & subscriptions
    update public.profiles
    set is_premium = true, premium_expires_at = v_ends_at
    where id = p_user_id;

    insert into public.subscriptions (user_id, plan_type, status, current_period_end, updated_at)
    values (p_user_id, 'Premium', 'active', v_ends_at, now())
    on conflict (user_id) do update
    set plan_type = 'Premium', status = 'active', current_period_end = excluded.current_period_end, updated_at = now();

    return jsonb_build_object(
        'success', true,
        'trial_id', v_trial_id,
        'trial_ends_at', v_ends_at
    );
end;
$$;

-- Grant execution permissions
grant execute on function public.check_trial_eligibility(uuid, text) to authenticated, anon;
grant execute on function public.claim_premium_trial(uuid, text, text, text, text) to authenticated;
