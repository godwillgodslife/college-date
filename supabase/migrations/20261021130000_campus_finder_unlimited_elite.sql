-- ============================================================================
-- The College Date: Campus Finder (Weekly Trial Reset & Unlimited Elite Access)
-- Migration: 20261021130000_campus_finder_unlimited_elite.sql
-- Description: 
--   1. Implements weekly replenishment (2 free trial searches per week).
--   2. Grants UNLIMITED Campus Finder optical scans to Elite Premium and Elite Ultra members.
-- ============================================================================

-- 1. Add weekly reset timestamp column to profiles
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS finder_weekly_reset_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- 2. Upgrade consume_finder_search RPC to bypass credit deduction for Elite members
CREATE OR REPLACE FUNCTION public.consume_finder_search(p_searcher_id uuid default null)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_searcher_id uuid;
    v_profile record;
    v_free_left integer;
    v_paid_left integer;
    v_hourly integer;
    v_last_search timestamptz;
    v_weekly_reset timestamptz;
    v_is_premium boolean := false;
BEGIN
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

    -- Check if searcher has active Elite Premium or Elite Ultra
    select (
        coalesce(v_profile.is_premium, false) = true
        or coalesce(v_profile.is_ultra, false) = true
        or (v_profile.premium_expires_at is not null and v_profile.premium_expires_at > now())
        or exists (
            select 1 from public.subscriptions s
            where s.user_id = v_searcher_id
              and s.status = 'active'
              and (s.current_period_end is null or s.current_period_end > now())
        )
    ) into v_is_premium;

    v_last_search := v_profile.finder_last_search_at;
    v_hourly := coalesce(v_profile.finder_hourly_searches, 0);

    -- Enforce hourly rate limit: Anti-abuse guard (30/hr for Elite, 5/hr for Free)
    if v_last_search is not null and v_last_search > now() - interval '1 hour' then
        if (v_is_premium and v_hourly >= 30) or (not v_is_premium and v_hourly >= 5) then
            return jsonb_build_object(
                'success', false,
                'error', 'Hourly search limit reached. Please try again later.',
                'rate_limited', true
            );
        end if;
        v_hourly := v_hourly + 1;
    else
        v_hourly := 1;
    end if;

    v_free_left := coalesce(v_profile.finder_free_searches_left, 2);
    v_paid_left := coalesce(v_profile.finder_paid_credits, 0);
    v_weekly_reset := v_profile.finder_weekly_reset_at;

    -- 2 Free Trial Searches Per Week Replenishment:
    -- If weekly reset has never been set, or is older than 7 days, replenish free searches to 2
    if v_weekly_reset is null or v_weekly_reset < now() - interval '7 days' then
        v_free_left := greatest(v_free_left, 2);
        v_weekly_reset := now();
    end if;

    -- If user is Elite Premium, Campus Finder is UNLIMITED!
    if v_is_premium then
        update public.profiles
        set finder_last_search_at = now(),
            finder_hourly_searches = v_hourly,
            finder_weekly_reset_at = coalesce(v_weekly_reset, now())
        where id = v_searcher_id;

        return jsonb_build_object(
            'success', true,
            'is_unlimited', true,
            'is_premium', true,
            'free_searches_left', v_free_left,
            'paid_credits', v_paid_left,
            'total_remaining', 999999
        );
    end if;

    -- Free / non-premium tier credit deduction
    if v_free_left > 0 then
        v_free_left := v_free_left - 1;
    elsif v_paid_left > 0 then
        v_paid_left := v_paid_left - 1;
    else
        return jsonb_build_object(
            'success', false,
            'error', 'You have used your 2 free Campus Finder searches for this week. Upgrade to College Date Elite for unlimited searches, or wait for next week''s reset!',
            'no_credits', true
        );
    end if;

    update public.profiles
    set finder_free_searches_left = v_free_left,
        finder_paid_credits = v_paid_left,
        finder_last_search_at = now(),
        finder_hourly_searches = v_hourly,
        finder_weekly_reset_at = v_weekly_reset
    where id = v_searcher_id;

    return jsonb_build_object(
        'success', true,
        'is_unlimited', false,
        'is_premium', false,
        'free_searches_left', v_free_left,
        'paid_credits', v_paid_left,
        'total_remaining', v_free_left + v_paid_left
    );
END;
$$;

-- 3. Upgrade get_finder_status RPC to return is_unlimited and weekly reset state
CREATE OR REPLACE FUNCTION public.get_finder_status(p_user_id uuid default null)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id uuid;
    v_profile record;
    v_free integer := 2;
    v_paid integer := 0;
    v_opted_in boolean := false;
    v_hourly integer := 0;
    v_last_search timestamptz;
    v_weekly_reset timestamptz;
    v_is_premium boolean := false;
BEGIN
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
        v_weekly_reset := v_profile.finder_weekly_reset_at;

        -- Weekly replenish for free members
        if v_weekly_reset is null or v_weekly_reset < now() - interval '7 days' then
            v_free := greatest(v_free, 2);
        end if;

        -- Check if user is active Elite Premium or Elite Ultra
        select (
            coalesce(v_profile.is_premium, false) = true
            or coalesce(v_profile.is_ultra, false) = true
            or (v_profile.premium_expires_at is not null and v_profile.premium_expires_at > now())
            or exists (
                select 1 from public.subscriptions s
                where s.user_id = v_user_id
                  and s.status = 'active'
                  and (s.current_period_end is null or s.current_period_end > now())
            )
        ) into v_is_premium;
    end if;

    return jsonb_build_object(
        'success', true,
        'is_unlimited', v_is_premium,
        'is_premium', v_is_premium,
        'allow_camera_discovery', v_opted_in,
        'free_searches_left', v_free,
        'paid_credits', v_paid,
        'total_remaining', case when v_is_premium then 999999 else (v_free + v_paid) end,
        'hourly_used', case when v_last_search > now() - interval '1 hour' then v_hourly else 0 end,
        'hourly_limit', case when v_is_premium then 30 else 5 end
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_finder_search TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_finder_status TO authenticated;

-- 4. Upgraded candidate discovery RPC: references public.user_blocks and is_shadow_banned
CREATE OR REPLACE FUNCTION public.get_eligible_campus_finder_profiles(
    p_university text,
    p_exclude_user_id uuid default null
)
RETURNS TABLE (
    id uuid,
    full_name text,
    avatar_url text,
    primary_photo text,
    university text,
    department text,
    level text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.full_name,
        p.avatar_url,
        coalesce(p.avatar_url, p.profile_photos[1]) as primary_photo,
        p.university,
        p.department,
        p.level
    FROM public.profiles p
    WHERE p.allow_camera_discovery = true
      AND (p_exclude_user_id IS NULL OR p.id != p_exclude_user_id)
      AND (p.university = p_university or p_university is null or p_university = 'All')
      AND (p.is_verified = true or p.photo_verified = true)
      AND NOT EXISTS (
          SELECT 1 FROM public.user_blocks b
          WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.id)
             OR (b.blocker_id = p.id AND b.blocked_id = auth.uid())
      )
      AND coalesce(p.is_shadow_banned, false) = false
      AND (p.avatar_url is not null or array_length(p.profile_photos, 1) > 0)
    ORDER BY p.last_seen_at desc nulls last
    LIMIT 25;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_eligible_campus_finder_profiles TO authenticated;
