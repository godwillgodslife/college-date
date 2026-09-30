-- ============================================================================
-- The College Date: Score Streak Engagement System
-- Migration: 20260919140000_score_streak_system.sql
-- Description: Server-authoritative daily engagement streak model with
--              idempotent audit log, milestone evaluation, and RLS.
-- ============================================================================

create table if not exists public.user_score_streaks (
    user_id uuid primary key references auth.users(id) on delete cascade,
    current_streak integer not null default 0 check (current_streak >= 0),
    longest_streak integer not null default 0 check (longest_streak >= 0),
    last_qualified_at timestamp with time zone,
    current_day_key text,
    streak_started_at timestamp with time zone default timezone('utc'::text, now()),
    last_activity_type text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.score_streak_events (
    id uuid default gen_random_uuid() primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    event_type text not null,
    event_date date not null default (current_timestamp at time zone 'UTC')::date,
    idempotency_key text unique not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_score_streak_events_user_date 
    on public.score_streak_events(user_id, event_date);

-- Enable RLS
alter table public.user_score_streaks enable row level security;
alter table public.score_streak_events enable row level security;

-- RLS Policies
drop policy if exists "Users can view own streak" on public.user_score_streaks;
create policy "Users can view own streak"
    on public.user_score_streaks for select
    using (auth.uid() = user_id);

drop policy if exists "Users can view own streak events" on public.score_streak_events;
create policy "Users can view own streak events"
    on public.score_streak_events for select
    using (auth.uid() = user_id);

-- Atomic RPC: record_streak_activity
create or replace function public.record_streak_activity(
    p_activity_type text default 'general',
    p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_user_id uuid;
    v_today date;
    v_yesterday date;
    v_today_key text;
    v_yesterday_key text;
    v_existing_event boolean;
    v_streak record;
    v_current_streak integer := 0;
    v_longest_streak integer := 0;
    v_is_new_day boolean := false;
    v_milestones integer[] := array[7, 14, 30, 60, 100];
    v_next_milestone integer := 7;
    v_milestone_reached integer := null;
    v_m integer;
    v_effective_idempotency text;
begin
    v_user_id := auth.uid();
    if v_user_id is null then
        return jsonb_build_object('success', false, 'error', 'Not authenticated');
    end if;

    v_today := (current_timestamp at time zone 'UTC')::date;
    v_yesterday := v_today - interval '1 day';
    v_today_key := to_char(v_today, 'YYYY-MM-DD');
    v_yesterday_key := to_char(v_yesterday, 'YYYY-MM-DD');

    v_effective_idempotency := coalesce(
        p_idempotency_key,
        'streak:' || v_user_id::text || ':' || v_today_key || ':' || p_activity_type
    );

    -- Check if today already has a recorded streak event for this user
    select exists (
        select 1 from public.score_streak_events
        where user_id = v_user_id and event_date = v_today
    ) into v_existing_event;

    select * into v_streak
    from public.user_score_streaks
    where user_id = v_user_id
    for update;

    if not found then
        -- Initial streak start
        v_current_streak := 1;
        v_longest_streak := 1;
        v_is_new_day := true;

        insert into public.user_score_streaks (
            user_id,
            current_streak,
            longest_streak,
            last_qualified_at,
            current_day_key,
            streak_started_at,
            last_activity_type,
            created_at,
            updated_at
        ) values (
            v_user_id,
            1,
            1,
            now(),
            v_today_key,
            now(),
            p_activity_type,
            now(),
            now()
        );
    elsif v_existing_event or v_streak.current_day_key = v_today_key then
        -- Already qualified today: maintain current streak without duplicate increment
        v_current_streak := v_streak.current_streak;
        v_longest_streak := v_streak.longest_streak;
        v_is_new_day := false;

        update public.user_score_streaks
        set updated_at = now()
        where user_id = v_user_id;
    else
        -- Qualifying activity on a new calendar day
        v_is_new_day := true;
        if v_streak.current_day_key = v_yesterday_key then
            -- Consecutive day! Increment streak
            v_current_streak := v_streak.current_streak + 1;
        else
            -- Broken streak (> 1 day gap) - reset to 1
            v_current_streak := 1;
        end if;

        v_longest_streak := greatest(v_streak.longest_streak, v_current_streak);

        update public.user_score_streaks
        set current_streak = v_current_streak,
            longest_streak = v_longest_streak,
            last_qualified_at = now(),
            current_day_key = v_today_key,
            last_activity_type = p_activity_type,
            streak_started_at = case when v_current_streak = 1 then now() else v_streak.streak_started_at end,
            updated_at = now()
        where user_id = v_user_id;
    end if;

    -- Record event in audit log (idempotent)
    insert into public.score_streak_events (
        user_id,
        event_type,
        event_date,
        idempotency_key,
        created_at
    ) values (
        v_user_id,
        p_activity_type,
        v_today,
        v_effective_idempotency,
        now()
    ) on conflict (idempotency_key) do nothing;

    -- Calculate next milestone & milestone celebration
    foreach v_m in array v_milestones loop
        if v_current_streak = v_m and v_is_new_day then
            v_milestone_reached := v_m;
        end if;
        if v_current_streak < v_m then
            v_next_milestone := v_m;
            exit;
        end if;
    end loop;

    -- Sync with engagement_scores and profiles for legacy compatibility
    insert into public.engagement_scores (user_id, score, daily_streak, last_login, streak_updated_at)
    values (v_user_id, v_current_streak * 10, v_current_streak, now(), now())
    on conflict (user_id) do update
    set daily_streak = excluded.daily_streak,
        score = public.engagement_scores.score + 5,
        streak_updated_at = now();

    return jsonb_build_object(
        'success', true,
        'current_streak', v_current_streak,
        'longest_streak', v_longest_streak,
        'is_new_day', v_is_new_day,
        'last_activity_type', p_activity_type,
        'today_key', v_today_key,
        'next_milestone', v_next_milestone,
        'milestone_reached', v_milestone_reached
    );
end;
$$;

-- Read-only getter RPC
create or replace function public.get_user_streak(p_user_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_user_id uuid;
    v_today date;
    v_yesterday date;
    v_today_key text;
    v_yesterday_key text;
    v_streak record;
    v_current_streak integer := 0;
    v_longest_streak integer := 0;
    v_active_today boolean := false;
    v_milestones integer[] := array[7, 14, 30, 60, 100];
    v_next_milestone integer := 7;
    v_m integer;
begin
    v_user_id := coalesce(p_user_id, auth.uid());
    if v_user_id is null then
        return jsonb_build_object('success', false, 'error', 'User ID required');
    end if;

    v_today := (current_timestamp at time zone 'UTC')::date;
    v_yesterday := v_today - interval '1 day';
    v_today_key := to_char(v_today, 'YYYY-MM-DD');
    v_yesterday_key := to_char(v_yesterday, 'YYYY-MM-DD');

    select * into v_streak
    from public.user_score_streaks
    where user_id = v_user_id;

    if found then
        v_longest_streak := v_streak.longest_streak;
        if v_streak.current_day_key = v_today_key then
            v_current_streak := v_streak.current_streak;
            v_active_today := true;
        elsif v_streak.current_day_key = v_yesterday_key then
            -- Active yesterday, still alive today but needs qualification!
            v_current_streak := v_streak.current_streak;
            v_active_today := false;
        else
            -- Expired streak (> 1 day missed)
            v_current_streak := 0;
            v_active_today := false;
        end if;
    end if;

    foreach v_m in array v_milestones loop
        if v_current_streak < v_m then
            v_next_milestone := v_m;
            exit;
        end if;
    end loop;

    return jsonb_build_object(
        'success', true,
        'current_streak', v_current_streak,
        'longest_streak', v_longest_streak,
        'active_today', v_active_today,
        'last_qualified_at', v_streak.last_qualified_at,
        'last_activity_type', v_streak.last_activity_type,
        'next_milestone', v_next_milestone,
        'progress_to_milestone', case
            when v_next_milestone > 0 then round((v_current_streak::numeric / v_next_milestone::numeric) * 100)
            else 100
        end
    );
end;
$$;

grant execute on function public.record_streak_activity to authenticated;
grant execute on function public.get_user_streak to authenticated;
