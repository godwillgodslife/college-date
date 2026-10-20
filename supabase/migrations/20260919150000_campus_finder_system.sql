-- ============================================================================
-- The College Date: Campus Finder (Privacy-Preserving Camera Discovery)
-- Migration: 20260919150000_campus_finder_system.sql
-- Description: Opt-in camera discovery schema, audit log, credit management,
--              rate-limiting, and eligible candidate querying with NDPA compliance.
-- ============================================================================

-- Add discovery opt-in and search credits to profiles
alter table public.profiles 
    add column if not exists allow_camera_discovery boolean default false,
    add column if not exists finder_free_searches_left integer default 2 check (finder_free_searches_left >= 0),
    add column if not exists finder_paid_credits integer default 0 check (finder_paid_credits >= 0),
    add column if not exists finder_last_search_at timestamp with time zone,
    add column if not exists finder_hourly_searches integer default 0;

-- Audit table for search accounting & abuse detection (no raw images stored)
create table if not exists public.campus_finder_searches (
    id uuid default gen_random_uuid() primary key,
    searcher_id uuid not null references auth.users(id) on delete cascade,
    matched_user_id uuid references auth.users(id) on delete set null,
    status text not null, -- 'match_found', 'no_match', 'no_face_detected', 'rate_limited'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_campus_finder_searches_user 
    on public.campus_finder_searches(searcher_id, created_at desc);

-- Enable RLS
alter table public.campus_finder_searches enable row level security;

drop policy if exists "Users can view own finder searches" on public.campus_finder_searches;
create policy "Users can view own finder searches"
    on public.campus_finder_searches for select
    using (auth.uid() = searcher_id);

-- Atomic RPC: Consume a finder search credit with rate limiting
create or replace function public.consume_finder_search(p_searcher_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_searcher_id uuid;
    v_profile record;
    v_free_left integer;
    v_paid_left integer;
    v_hourly integer;
    v_last_search timestamptz;
begin
    v_searcher_id := coalesce(p_searcher_id, auth.uid());
    if v_searcher_id is null or auth.uid() != v_searcher_id then
        return jsonb_build_object('success', false, 'error', 'Unauthorized');
    end if;

    select * into v_profile
    from public.profiles
    where id = v_searcher_id
    for update;

    if not found then
        return jsonb_build_object('success', false, 'error', 'Profile not found');
    end if;

    v_last_search := v_profile.finder_last_search_at;
    v_hourly := coalesce(v_profile.finder_hourly_searches, 0);

    -- Enforce hourly rate limit: Max 5 searches per hour
    if v_last_search is not null and v_last_search > now() - interval '1 hour' then
        if v_hourly >= 5 then
            return jsonb_build_object(
                'success', false,
                'error', 'Hourly search limit reached (max 5 per hour). Please try again later.',
                'rate_limited', true
            );
        end if;
        v_hourly := v_hourly + 1;
    else
        v_hourly := 1;
    end if;

    v_free_left := coalesce(v_profile.finder_free_searches_left, 2);
    v_paid_left := coalesce(v_profile.finder_paid_credits, 0);

    -- Credit deduction
    if v_free_left > 0 then
        v_free_left := v_free_left - 1;
    elsif v_paid_left > 0 then
        v_paid_left := v_paid_left - 1;
    else
        return jsonb_build_object(
            'success', false,
            'error', 'No searches remaining. Top up your search credits to continue.',
            'no_credits', true
        );
    end if;

    update public.profiles
    set finder_free_searches_left = v_free_left,
        finder_paid_credits = v_paid_left,
        finder_last_search_at = now(),
        finder_hourly_searches = v_hourly
    where id = v_searcher_id;

    return jsonb_build_object(
        'success', true,
        'free_searches_left', v_free_left,
        'paid_credits', v_paid_left,
        'total_remaining', v_free_left + v_paid_left
    );
end;
$$;

-- Status query RPC
create or replace function public.get_finder_status(p_user_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_user_id uuid;
    v_profile record;
    v_free integer := 2;
    v_paid integer := 0;
    v_opted_in boolean := false;
    v_hourly integer := 0;
    v_last_search timestamptz;
begin
    v_user_id := coalesce(p_user_id, auth.uid());
    if v_user_id is null then
        return jsonb_build_object('success', false, 'error', 'User ID required');
    end if;

    select * into v_profile
    from public.profiles
    where id = v_user_id;

    if found then
        v_free := coalesce(v_profile.finder_free_searches_left, 2);
        v_paid := coalesce(v_profile.finder_paid_credits, 0);
        v_opted_in := coalesce(v_profile.allow_camera_discovery, false);
        v_hourly := coalesce(v_profile.finder_hourly_searches, 0);
        v_last_search := v_profile.finder_last_search_at;
    end if;

    return jsonb_build_object(
        'success', true,
        'allow_camera_discovery', v_opted_in,
        'free_searches_left', v_free,
        'paid_credits', v_paid,
        'total_remaining', v_free + v_paid,
        'hourly_used', case when v_last_search > now() - interval '1 hour' then v_hourly else 0 end,
        'hourly_limit', 5
    );
end;
$$;

-- Secure candidate discovery RPC: returns ONLY opted-in, non-blocked candidates
create or replace function public.get_eligible_campus_finder_profiles(
    p_university text,
    p_exclude_user_id uuid default null
)
returns table (
    id uuid,
    full_name text,
    avatar_url text,
    primary_photo text,
    university text,
    department text,
    level text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_searcher_id uuid;
begin
    v_searcher_id := coalesce(p_exclude_user_id, auth.uid());

    return query
    select 
        p.id,
        p.full_name,
        p.avatar_url,
        coalesce(p.avatar_url, p.profile_photos[1]) as primary_photo,
        p.university,
        p.department,
        p.level
    from public.profiles p
    where p.allow_camera_discovery = true
      and p.id != v_searcher_id
      and (p.university = p_university or p_university is null or p_university = 'All')
      and (p.is_verified = true or p.photo_verified = true)
      and not exists (
          select 1 from public.user_blocks b
          where (b.blocker_id = v_searcher_id and b.blocked_id = p.id)
             or (b.blocker_id = p.id and b.blocked_id = v_searcher_id)
      )
      and coalesce(p.is_shadow_banned, false) = false
      and (p.avatar_url is not null or array_length(p.profile_photos, 1) > 0)
    order by p.last_seen_at desc nulls last
    limit 25;
end;
$$;

grant execute on function public.consume_finder_search to authenticated;
grant execute on function public.get_finder_status to authenticated;
grant execute on function public.get_eligible_campus_finder_profiles to authenticated;
