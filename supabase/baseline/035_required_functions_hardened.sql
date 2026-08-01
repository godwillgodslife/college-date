-- The College Date staging schema baseline
-- Source: production metadata from Supabase project gedoyoleoscgxgdqszzc on 2026-08-01.
-- Scope: hardened PostgreSQL function/RPC subset required for staging bootstrap only.
--
-- This file intentionally does not reproduce production admin, payment, wallet reward,
-- push delivery, call, or scheduled maintenance functions. It creates a narrow
-- authenticated RPC surface for profile bootstrap, referral attribution, discovery,
-- standard swipe/match testing, leaderboard reads, and confession feed/reactions.

set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- Referral helpers and profile bootstrap
-- ---------------------------------------------------------------------------

create or replace function public.normalize_referral_code(p_code text)
returns text
language sql
immutable
security invoker
set search_path to ''
as $$
    select nullif(
        upper(regexp_replace(btrim(coalesce(p_code, '')), '[^A-Za-z0-9-]', '', 'g')),
        ''
    );
$$;

create or replace function public.generate_referral_code()
returns text
language plpgsql
volatile
security invoker
set search_path to ''
as $$
declare
    v_chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    v_result text := 'CD-';
    v_i integer;
begin
    for v_i in 1..5 loop
        v_result := v_result || substr(v_chars, floor(random() * length(v_chars) + 1)::integer, 1);
    end loop;

    return v_result;
end;
$$;

create or replace function public.generate_unique_referral_code()
returns text
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
    v_code text;
    v_exists boolean;
    v_attempts integer := 0;
begin
    loop
        v_attempts := v_attempts + 1;
        v_code := public.generate_referral_code();

        select exists (
            select 1
            from public.profiles p
            where lower(p.referral_code) = lower(v_code)
        )
        into v_exists;

        if not coalesce(v_exists, false) then
            return v_code;
        end if;

        if v_attempts >= 20 then
            raise exception 'referral_code_generation_failed';
        end if;
    end loop;
end;
$$;

create or replace function public.handle_new_profile_referral()
returns trigger
language plpgsql
volatile
security definer
set search_path to ''
as $$
begin
    new.referral_code := coalesce(
        public.normalize_referral_code(new.referral_code),
        public.generate_unique_referral_code()
    );

    return new;
end;
$$;

create or replace function public.sync_referral_from_profile()
returns trigger
language plpgsql
volatile
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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
    v_full_name text;
    v_gender text;
    v_role text;
    v_university text;
    v_referral_code text;
    v_referred_by_text text;
    v_referred_by uuid;
begin
    v_full_name := nullif(btrim(coalesce(new.raw_user_meta_data->>'full_name', '')), '');
    v_gender := lower(nullif(btrim(coalesce(new.raw_user_meta_data->>'gender', new.raw_user_meta_data->>'role', '')), ''));
    v_university := nullif(btrim(coalesce(new.raw_user_meta_data->>'university', '')), '');
    v_referral_code := public.normalize_referral_code(new.raw_user_meta_data->>'referral_code');
    v_referred_by_text := nullif(btrim(coalesce(new.raw_user_meta_data->>'referred_by', '')), '');

    if v_gender not in ('male', 'female', 'other') then
        v_gender := 'male';
    end if;

    v_role := initcap(v_gender);

    if v_referral_code is not null then
        select p.id
        into v_referred_by
        from public.profiles p
        where lower(p.referral_code) = lower(v_referral_code)
          and p.id <> new.id
          and coalesce(p.is_banned, false) = false
          and coalesce(p.is_shadow_banned, false) = false
        limit 1;
    elsif v_referred_by_text is not null then
        begin
            v_referred_by := v_referred_by_text::uuid;
        exception when invalid_text_representation then
            v_referred_by := null;
        end;

        if v_referred_by = new.id then
            v_referred_by := null;
        end if;
    end if;

    insert into public.profiles (
        id,
        email,
        full_name,
        gender,
        age,
        university,
        role,
        free_swipes,
        referred_by,
        is_onboarded
    )
    values (
        new.id,
        coalesce(nullif(new.email, ''), new.id::text),
        coalesce(v_full_name, nullif(new.email, ''), 'Student'),
        v_gender,
        19,
        coalesce(v_university, 'Campus'),
        v_role,
        20,
        v_referred_by,
        false
    )
    on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
        referred_by = coalesce(public.profiles.referred_by, excluded.referred_by),
        updated_at = now();

    insert into public.user_settings (user_id)
    values (new.id)
    on conflict (user_id) do nothing;

    insert into public.swipe_limits (user_id, swipes_used, last_reset)
    values (new.id, 0, now())
    on conflict (user_id) do nothing;

    insert into public.engagement_scores (user_id, score, daily_streak, last_login)
    values (new.id, 0, 0, now())
    on conflict (user_id) do nothing;

    return new;
end;
$$;

create or replace function public.validate_referral_code(p_code text)
returns jsonb
language plpgsql
stable
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

    select p.referral_code, p.full_name, p.username
    into v_referrer
    from public.profiles p
    where lower(p.referral_code) = lower(v_code)
      and coalesce(p.is_banned, false) = false
      and coalesce(p.is_shadow_banned, false) = false
    limit 1;

    if not found then
        return jsonb_build_object('valid', false, 'reason', 'not_found', 'code', v_code);
    end if;

    return jsonb_build_object(
        'valid', true,
        'reason', 'valid',
        'code', v_referrer.referral_code,
        'referrer_name', coalesce(
            nullif(split_part(btrim(coalesce(v_referrer.full_name, '')), ' ', 1), ''),
            v_referrer.username,
            'a student'
        )
    );
end;
$$;

create or replace function public.apply_referral_code(p_code text)
returns jsonb
language plpgsql
volatile
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

    select p.id, p.referral_code, p.full_name, p.username
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
            'code', v_referrer.referral_code
        );
    end if;

    select r.referrer_id
    into v_existing_referrer
    from public.referrals r
    where r.referred_id = v_user_id
    for update;

    if v_existing_referrer is not null then
        update public.profiles
        set referred_by = v_existing_referrer,
            updated_at = now()
        where id = v_user_id
          and referred_by is null;

        return jsonb_build_object(
            'success', v_existing_referrer = v_referrer.id,
            'already_applied', true,
            'reason', 'already_applied',
            'code', v_referrer.referral_code
        );
    end if;

    update public.profiles
    set referred_by = v_referrer.id,
        updated_at = now()
    where id = v_user_id
      and referred_by is null;

    insert into public.referrals (referrer_id, referred_id, status)
    values (v_referrer.id, v_user_id, 'pending')
    on conflict (referred_id) do nothing;

    return jsonb_build_object(
        'success', true,
        'reason', 'applied',
        'code', v_referrer.referral_code,
        'referrer_name', coalesce(
            nullif(split_part(btrim(coalesce(v_referrer.full_name, '')), ' ', 1), ''),
            v_referrer.username,
            'a student'
        )
    );
end;
$$;

-- ---------------------------------------------------------------------------
-- Profile and onboarding RPCs
-- ---------------------------------------------------------------------------

create or replace function public.calculate_completion_score()
returns trigger
language plpgsql
volatile
security invoker
set search_path to ''
as $$
declare
    v_profile jsonb := to_jsonb(new);
    v_score integer := 0;
begin
    if coalesce(v_profile->>'full_name', '') <> '' then v_score := v_score + 15; end if;
    if coalesce(v_profile->>'bio', '') <> '' then v_score := v_score + 15; end if;
    if coalesce(v_profile->>'university', '') <> '' then v_score := v_score + 10; end if;
    if coalesce(v_profile->>'gender', '') <> '' then v_score := v_score + 10; end if;
    if coalesce(v_profile->>'age', '') <> '' then v_score := v_score + 10; end if;
    if coalesce(v_profile->>'avatar_url', '') <> ''
       or case
            when jsonb_typeof(v_profile->'profile_photos') = 'array'
            then jsonb_array_length(v_profile->'profile_photos')
            else 0
          end > 0
       or case
            when jsonb_typeof(v_profile->'photos') = 'array'
            then jsonb_array_length(v_profile->'photos')
            else 0
          end > 0 then
        v_score := v_score + 25;
    end if;
    if case
        when jsonb_typeof(v_profile->'interests') = 'array'
        then jsonb_array_length(v_profile->'interests')
        else 0
      end > 0 then
        v_score := v_score + 15;
    end if;

    new.completion_score := least(v_score, 100);
    return new;
end;
$$;

create or replace function public.update_photo_timestamp()
returns trigger
language plpgsql
volatile
security invoker
set search_path to ''
as $$
begin
    if new.avatar_url is distinct from old.avatar_url
       or new.photos is distinct from old.photos
       or new.profile_photos is distinct from old.profile_photos then
        new.photo_updated_at = now();
    end if;

    return new;
end;
$$;

create or replace function public.get_current_profile()
returns table (
    id uuid,
    email text,
    full_name text,
    gender text,
    age integer,
    university text,
    bio text,
    phone text,
    avatar_url text,
    photos text[],
    profile_photos text[],
    interests jsonb,
    faculty text,
    department text,
    level text,
    mbti text,
    attraction_goal text,
    interest_gender text,
    intro_prompt text,
    voice_intro_url text,
    anthem text,
    location_status text,
    referral_code text,
    referred_by uuid,
    is_verified boolean,
    is_onboarded boolean,
    completion_score integer,
    free_swipes integer,
    free_swipes_remaining integer,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    last_seen_at timestamp with time zone,
    last_active timestamp with time zone
)
language sql
stable
security invoker
set search_path to ''
as $$
    select
        p.id,
        p.email,
        p.full_name,
        p.gender,
        p.age,
        p.university,
        p.bio,
        p.phone,
        p.avatar_url,
        p.photos,
        p.profile_photos,
        p.interests,
        p.faculty,
        p.department,
        p.level,
        p.mbti,
        p.attraction_goal,
        p.interest_gender,
        p.intro_prompt,
        p.voice_intro_url,
        p.anthem,
        p.location_status,
        p.referral_code,
        p.referred_by,
        p.is_verified,
        p.is_onboarded,
        p.completion_score,
        p.free_swipes,
        p.free_swipes_remaining,
        p.created_at,
        p.updated_at,
        p.last_seen_at,
        p.last_active
    from public.profiles p
    where p.id = (select auth.uid());
$$;

create or replace function public.update_current_profile(p_profile jsonb default '{}'::jsonb)
returns table (
    id uuid,
    email text,
    full_name text,
    gender text,
    age integer,
    university text,
    bio text,
    phone text,
    avatar_url text,
    photos text[],
    profile_photos text[],
    interests jsonb,
    faculty text,
    department text,
    level text,
    mbti text,
    attraction_goal text,
    interest_gender text,
    intro_prompt text,
    voice_intro_url text,
    anthem text,
    location_status text,
    referral_code text,
    referred_by uuid,
    is_verified boolean,
    is_onboarded boolean,
    completion_score integer,
    free_swipes integer,
    free_swipes_remaining integer,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    last_seen_at timestamp with time zone,
    last_active timestamp with time zone
)
language plpgsql
volatile
security invoker
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_full_name text := nullif(btrim(coalesce(p_profile->>'full_name', '')), '');
    v_gender text := lower(nullif(btrim(coalesce(p_profile->>'gender', '')), ''));
    v_university text := nullif(btrim(coalesce(p_profile->>'university', '')), '');
    v_bio text := nullif(btrim(coalesce(p_profile->>'bio', '')), '');
    v_avatar_url text := nullif(btrim(coalesce(p_profile->>'avatar_url', '')), '');
    v_phone text := nullif(btrim(coalesce(p_profile->>'phone', '')), '');
    v_faculty text := nullif(btrim(coalesce(p_profile->>'faculty', '')), '');
    v_department text := nullif(btrim(coalesce(p_profile->>'department', '')), '');
    v_level text := nullif(btrim(coalesce(p_profile->>'level', '')), '');
    v_mbti text := nullif(btrim(coalesce(p_profile->>'mbti', '')), '');
    v_attraction_goal text := nullif(btrim(coalesce(p_profile->>'attraction_goal', '')), '');
    v_interest_gender text := initcap(nullif(btrim(coalesce(p_profile->>'interest_gender', '')), ''));
    v_intro_prompt text := nullif(btrim(coalesce(p_profile->>'intro_prompt', '')), '');
    v_voice_intro_url text := nullif(btrim(coalesce(p_profile->>'voice_intro_url', '')), '');
    v_anthem text := nullif(btrim(coalesce(p_profile->>'anthem', '')), '');
    v_location_status text := nullif(btrim(coalesce(p_profile->>'location_status', '')), '');
    v_age integer;
    v_requested_onboarded boolean := lower(coalesce(p_profile->>'is_onboarded', 'false')) in ('true', '1', 'yes');
begin
    if v_user_id is null then
        raise exception 'not_authenticated';
    end if;

    if p_profile ? 'age' then
        begin
            v_age := (p_profile->>'age')::integer;
        exception when invalid_text_representation then
            raise exception 'invalid_age';
        end;

        if v_age < 18 then
            raise exception 'age_must_be_18_or_older';
        end if;
    end if;

    if v_gender is not null and v_gender not in ('male', 'female', 'other') then
        raise exception 'invalid_gender';
    end if;

    if v_interest_gender is not null and v_interest_gender not in ('Male', 'Female', 'All') then
        raise exception 'invalid_interest_gender';
    end if;

    update public.profiles p
    set full_name = coalesce(v_full_name, p.full_name),
        age = coalesce(v_age, p.age),
        gender = coalesce(v_gender, p.gender),
        university = coalesce(v_university, p.university),
        bio = coalesce(v_bio, p.bio),
        avatar_url = coalesce(v_avatar_url, p.avatar_url),
        phone = coalesce(v_phone, p.phone),
        faculty = coalesce(v_faculty, p.faculty),
        department = coalesce(v_department, p.department),
        level = coalesce(v_level, p.level),
        mbti = coalesce(v_mbti, p.mbti),
        attraction_goal = coalesce(v_attraction_goal, p.attraction_goal),
        interest_gender = coalesce(v_interest_gender, p.interest_gender),
        intro_prompt = coalesce(v_intro_prompt, p.intro_prompt),
        voice_intro_url = coalesce(v_voice_intro_url, p.voice_intro_url),
        anthem = coalesce(v_anthem, p.anthem),
        location_status = coalesce(v_location_status, p.location_status),
        photos = case
            when jsonb_typeof(p_profile->'photos') = 'array'
            then array(select jsonb_array_elements_text(p_profile->'photos'))
            else p.photos
        end,
        profile_photos = case
            when jsonb_typeof(p_profile->'profile_photos') = 'array'
            then array(select jsonb_array_elements_text(p_profile->'profile_photos'))
            else p.profile_photos
        end,
        interests = case
            when jsonb_typeof(p_profile->'interests') = 'array'
            then p_profile->'interests'
            else p.interests
        end,
        is_onboarded = case
            when v_requested_onboarded then
                coalesce(v_full_name, p.full_name, '') <> ''
                and coalesce(v_age, p.age, 0) >= 18
                and coalesce(v_gender, p.gender, '') <> ''
                and coalesce(v_university, p.university, '') <> ''
            else p.is_onboarded
        end,
        updated_at = now()
    where p.id = v_user_id;

    if not found then
        raise exception 'profile_missing';
    end if;

    return query select * from public.get_current_profile();
end;
$$;

create or replace function public.update_user_presence()
returns void
language plpgsql
volatile
security invoker
set search_path to ''
as $$
begin
    if auth.uid() is null then
        raise exception 'not_authenticated';
    end if;

    update public.profiles
    set last_seen_at = now(),
        last_seen = now(),
        last_active = now(),
        is_online = true,
        is_live = true,
        updated_at = now()
    where id = (select auth.uid());
end;
$$;

-- ---------------------------------------------------------------------------
-- Safe discovery, swipe, match, leaderboard, and confession RPCs
-- ---------------------------------------------------------------------------

create or replace function public.check_and_reset_swipe_limit(p_user_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_used integer;
    v_last_reset timestamp with time zone;
    v_max integer := 20;
    v_is_premium boolean := false;
begin
    if v_user_id is null or v_user_id <> p_user_id then
        return jsonb_build_object('success', false, 'error', 'not_authorized');
    end if;

    select
        coalesce(p.is_premium, false)
        or exists (
            select 1
            from public.subscriptions s
            where s.user_id = p_user_id
              and s.plan_type = 'Premium'
              and s.status = 'active'
              and (s.current_period_end is null or s.current_period_end > now())
        )
    into v_is_premium
    from public.profiles p
    where p.id = p_user_id;

    if not found then
        return jsonb_build_object('success', false, 'error', 'profile_missing');
    end if;

    if coalesce(v_is_premium, false) then
        return jsonb_build_object(
            'success', true,
            'can_swipe', true,
            'used_count', 0,
            'max_count', 999999,
            'is_premium', true
        );
    end if;

    select sl.swipes_used, sl.last_reset
    into v_used, v_last_reset
    from public.swipe_limits sl
    where sl.user_id = p_user_id
    for update;

    if v_used is null then
        insert into public.swipe_limits (user_id, swipes_used, last_reset)
        values (p_user_id, 0, now())
        on conflict (user_id) do nothing;

        v_used := 0;
        v_last_reset := now();
    end if;

    if v_last_reset < now() - interval '24 hours' then
        update public.swipe_limits
        set swipes_used = 0,
            last_reset = now()
        where user_id = p_user_id;

        v_used := 0;
    end if;

    return jsonb_build_object(
        'success', true,
        'can_swipe', coalesce(v_used, 0) < v_max,
        'used_count', coalesce(v_used, 0),
        'max_count', v_max,
        'is_premium', false
    );
end;
$$;

create or replace function public.get_discovery_profiles(
    p_limit integer default 40,
    p_offset integer default 0,
    p_filters jsonb default '{}'::jsonb
)
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
    is_live boolean,
    is_boosted boolean,
    seen_count integer
)
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_limit integer := least(greatest(coalesce(p_limit, 40), 1), 50);
    v_offset integer := greatest(coalesce(p_offset, 0), 0);
    v_university text := nullif(btrim(coalesce(p_filters->>'university', '')), '');
    v_gender text := lower(nullif(btrim(coalesce(p_filters->>'gender', '')), ''));
    v_live_only boolean := lower(coalesce(p_filters->>'live_only', 'false')) in ('true', '1', 'yes');
    v_me record;
begin
    if v_user_id is null then
        raise exception 'not_authenticated';
    end if;

    select p.id, p.gender, p.university, p.interest_gender, p.is_onboarded, p.is_banned, p.is_shadow_banned
    into v_me
    from public.profiles p
    where p.id = v_user_id;

    if not found then
        raise exception 'profile_missing';
    end if;

    if coalesce(v_me.is_banned, false) or coalesce(v_me.is_shadow_banned, false) then
        raise exception 'profile_not_allowed';
    end if;

    if coalesce(v_me.is_onboarded, false) = false then
        raise exception 'onboarding_required';
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
        coalesce(p.last_active, p.last_seen_at) > now() - interval '15 minutes' as is_live,
        exists (
            select 1
            from public.boosts b
            where b.user_id = p.id
              and b.type = '24h_boost'
              and b.expires_at > now()
        ) as is_boosted,
        coalesce(fi.seen_count, 0) as seen_count
    from public.profiles p
    left join public.feed_impressions fi
      on fi.user_id = v_user_id
     and fi.entity_type = 'profile'
     and fi.entity_id = p.id
    where p.id <> v_user_id
      and coalesce(p.is_onboarded, false) = true
      and coalesce(p.is_banned, false) = false
      and coalesce(p.is_shadow_banned, false) = false
      and coalesce(p.is_blocked, false) = false
      and coalesce(p.incognito_mode, false) = false
      and (v_university is null or lower(p.university) = lower(v_university))
      and (v_gender is null or lower(p.gender) = v_gender)
      and (
          coalesce(v_me.interest_gender, 'All') = 'All'
          or lower(p.gender) = lower(v_me.interest_gender)
      )
      and (
          coalesce(p.interest_gender, 'All') = 'All'
          or lower(p.interest_gender) = lower(v_me.gender)
      )
      and (
          v_live_only = false
          or coalesce(p.last_active, p.last_seen_at) > now() - interval '15 minutes'
      )
      and not exists (
          select 1
          from public.swipes s
          where s.swiper_id = v_user_id
            and s.swiped_id = p.id
      )
      and not exists (
          select 1
          from public.matches m
          where m.user_ids @> array[v_user_id, p.id]::uuid[]
      )
      and not exists (
          select 1
          from public.reports r
          where (
              (r.reporter_id = v_user_id and r.reported_id = p.id)
              or (r.reporter_id = p.id and r.reported_id = v_user_id)
          )
          and coalesce(r.status, 'pending') <> 'dismissed'
      )
    order by
        exists (
            select 1
            from public.boosts b
            where b.user_id = p.id
              and b.type = '24h_boost'
              and b.expires_at > now()
        ) desc,
        (lower(p.university) = lower(coalesce(v_me.university, ''))) desc,
        coalesce(p.completion_score, 0) desc,
        coalesce(p.last_active, p.last_seen_at, p.created_at) desc nulls last,
        p.id
    limit v_limit
    offset v_offset;
end;
$$;

create or replace function public.record_feed_impression(
    p_entity_type text,
    p_entity_id uuid,
    p_source text default null,
    p_engaged boolean default false
)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
begin
    if v_user_id is null then
        return jsonb_build_object('success', false, 'error', 'not_authenticated');
    end if;

    if p_entity_type not in ('profile', 'confession') then
        return jsonb_build_object('success', false, 'error', 'invalid_entity_type');
    end if;

    insert into public.feed_impressions (
        user_id,
        entity_type,
        entity_id,
        first_seen_at,
        last_seen_at,
        seen_count,
        last_source,
        last_engaged_at
    )
    values (
        v_user_id,
        p_entity_type,
        p_entity_id,
        now(),
        now(),
        1,
        nullif(p_source, ''),
        case when p_engaged then now() else null end
    )
    on conflict (user_id, entity_type, entity_id)
    do update set
        last_seen_at = now(),
        seen_count = public.feed_impressions.seen_count + 1,
        last_source = coalesce(nullif(p_source, ''), public.feed_impressions.last_source),
        last_engaged_at = case
            when p_engaged then now()
            else public.feed_impressions.last_engaged_at
        end;

    return jsonb_build_object('success', true);
end;
$$;

create or replace function public.record_profile_swipe(
    p_target_id uuid,
    p_direction text,
    p_swipe_type text default 'standard',
    p_message_teaser text default null,
    p_client_operation_id text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_direction text := lower(nullif(btrim(coalesce(p_direction, '')), ''));
    v_swipe_type text := lower(nullif(btrim(coalesce(p_swipe_type, 'standard')), ''));
    v_quota jsonb;
    v_swipe_id uuid;
    v_match_id uuid;
    v_is_match boolean := false;
    v_participants uuid[];
begin
    if v_user_id is null then
        return jsonb_build_object('success', false, 'error', 'not_authenticated');
    end if;

    if p_target_id is null or p_target_id = v_user_id then
        return jsonb_build_object('success', false, 'error', 'invalid_target');
    end if;

    if v_direction not in ('left', 'right') then
        return jsonb_build_object('success', false, 'error', 'invalid_direction');
    end if;

    if v_swipe_type <> 'standard' then
        return jsonb_build_object('success', false, 'error', 'swipe_type_deferred');
    end if;

    if not exists (
        select 1
        from public.profiles p
        where p.id = v_user_id
          and coalesce(p.is_onboarded, false) = true
          and coalesce(p.is_banned, false) = false
          and coalesce(p.is_shadow_banned, false) = false
    ) then
        return jsonb_build_object('success', false, 'error', 'caller_not_eligible');
    end if;

    if not exists (
        select 1
        from public.profiles p
        where p.id = p_target_id
          and coalesce(p.is_onboarded, false) = true
          and coalesce(p.is_banned, false) = false
          and coalesce(p.is_shadow_banned, false) = false
          and coalesce(p.is_blocked, false) = false
    ) then
        return jsonb_build_object('success', false, 'error', 'target_not_available');
    end if;

    v_quota := public.check_and_reset_swipe_limit(v_user_id);

    if coalesce((v_quota->>'can_swipe')::boolean, false) = false then
        return jsonb_build_object('success', false, 'error', 'daily_swipe_limit_reached', 'quota', v_quota);
    end if;

    insert into public.swipes (
        swiper_id,
        swiped_id,
        direction,
        type,
        status,
        is_priority,
        is_free,
        message_teaser,
        created_at
    )
    values (
        v_user_id,
        p_target_id,
        v_direction,
        'standard',
        case when v_direction = 'right' then 'pending' else 'declined' end,
        false,
        true,
        nullif(btrim(coalesce(p_message_teaser, '')), ''),
        now()
    )
    on conflict (swiper_id, swiped_id) do update
    set direction = excluded.direction,
        type = 'standard',
        status = excluded.status,
        is_priority = false,
        is_free = true,
        message_teaser = excluded.message_teaser,
        created_at = now()
    returning id into v_swipe_id;

    update public.swipe_limits
    set swipes_used = coalesce(swipes_used, 0) + 1
    where user_id = v_user_id
      and coalesce((v_quota->>'is_premium')::boolean, false) = false;

    insert into public.engagement_scores (user_id, score, daily_streak, last_login, last_swipe_at, streak_updated_at)
    values (v_user_id, 1, 1, now(), now(), now())
    on conflict (user_id) do update
    set score = public.engagement_scores.score + 1,
        daily_streak = case
            when public.engagement_scores.last_swipe_at > now() - interval '36 hours'
            then public.engagement_scores.daily_streak + 1
            else 1
        end,
        last_login = now(),
        last_swipe_at = now(),
        streak_updated_at = now();

    perform public.record_feed_impression('profile', p_target_id, 'swipe', true);

    if v_direction = 'right' and exists (
        select 1
        from public.swipes s
        where s.swiper_id = p_target_id
          and s.swiped_id = v_user_id
          and s.direction = 'right'
          and s.status in ('pending', 'accepted')
    ) then
        v_participants := array[least(v_user_id, p_target_id), greatest(v_user_id, p_target_id)]::uuid[];

        insert into public.matches (user1_id, user2_id, user_ids, created_at)
        values (v_participants[1], v_participants[2], v_participants, now())
        on conflict (user1_id, user2_id) do update
        set user_ids = excluded.user_ids
        returning id into v_match_id;

        update public.swipes
        set status = 'accepted'
        where (swiper_id = v_user_id and swiped_id = p_target_id)
           or (swiper_id = p_target_id and swiped_id = v_user_id);

        v_is_match := true;
    end if;

    return jsonb_build_object(
        'success', true,
        'swipe_id', v_swipe_id,
        'is_match', v_is_match,
        'match_id', v_match_id,
        'direction', v_direction,
        'type', 'standard',
        'client_operation_id', nullif(btrim(coalesce(p_client_operation_id, '')), '')
    );
exception when others then
    return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

create or replace function public.accept_swipe_request(p_swipe_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_swiper_id uuid;
    v_swiped_id uuid;
    v_match_id uuid;
    v_participants uuid[];
begin
    if v_user_id is null then
        return jsonb_build_object('success', false, 'error', 'not_authenticated');
    end if;

    select s.swiper_id, s.swiped_id
    into v_swiper_id, v_swiped_id
    from public.swipes s
    where s.id = p_swipe_id
      and s.swiped_id = v_user_id
      and s.direction = 'right'
      and s.status = 'pending'
    for update;

    if not found then
        return jsonb_build_object('success', false, 'error', 'request_not_found_or_unauthorized');
    end if;

    update public.swipes
    set status = 'accepted'
    where id = p_swipe_id;

    v_participants := array[least(v_swiper_id, v_swiped_id), greatest(v_swiper_id, v_swiped_id)]::uuid[];

    insert into public.matches (user1_id, user2_id, user_ids, created_at)
    values (v_participants[1], v_participants[2], v_participants, now())
    on conflict (user1_id, user2_id) do update
    set user_ids = excluded.user_ids
    returning id into v_match_id;

    return jsonb_build_object('success', true, 'match_id', v_match_id);
exception when others then
    return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

create or replace function public.get_leaderboard_profiles(
    p_kind text default 'most_wanted',
    p_limit integer default 50
)
returns table (
    rank integer,
    profile_id uuid,
    full_name text,
    avatar_url text,
    university text,
    gender text,
    score integer,
    metric text
)
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_kind text := lower(coalesce(nullif(btrim(p_kind), ''), 'most_wanted'));
    v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
    if v_user_id is null then
        raise exception 'not_authenticated';
    end if;

    if v_kind not in ('most_wanted', 'campus_stars', 'active') then
        v_kind := 'most_wanted';
    end if;

    return query
    with likes as (
        select s.swiped_id as user_id, count(*)::integer as like_count
        from public.swipes s
        where s.direction = 'right'
        group by s.swiped_id
    ),
    views as (
        select pv.profile_owner_id as user_id, count(*)::integer as view_count
        from public.profile_views pv
        group by pv.profile_owner_id
    ),
    match_counts as (
        select user_id, count(*)::integer as match_count
        from (
            select m.user1_id as user_id from public.matches m
            union all
            select m.user2_id as user_id from public.matches m
        ) x
        group by user_id
    ),
    scored as (
        select
            p.id,
            p.full_name,
            p.avatar_url,
            p.university,
            p.gender,
            case
                when v_kind = 'campus_stars' then coalesce(p.completion_score, 0) + coalesce(es.score, 0)
                when v_kind = 'active' then coalesce(es.score, 0) + coalesce(mc.match_count, 0) * 5
                else coalesce(l.like_count, 0) * 10 + coalesce(v.view_count, 0) * 2 + coalesce(mc.match_count, 0) * 5
            end::integer as leaderboard_score
        from public.profiles p
        left join likes l on l.user_id = p.id
        left join views v on v.user_id = p.id
        left join match_counts mc on mc.user_id = p.id
        left join public.engagement_scores es on es.user_id = p.id
        where coalesce(p.is_onboarded, false) = true
          and coalesce(p.is_banned, false) = false
          and coalesce(p.is_shadow_banned, false) = false
          and coalesce(p.incognito_mode, false) = false
    )
    select
        row_number() over (order by s.leaderboard_score desc, s.full_name asc)::integer as rank,
        s.id as profile_id,
        s.full_name,
        s.avatar_url,
        s.university,
        s.gender,
        s.leaderboard_score as score,
        v_kind as metric
    from scored s
    where s.leaderboard_score > 0
    order by s.leaderboard_score desc, s.full_name asc
    limit v_limit;
end;
$$;

create or replace function public.get_confession_feed(
    p_university text default null,
    p_limit integer default 50,
    p_offset integer default 0
)
returns table (
    id uuid,
    content text,
    university text,
    created_at timestamp with time zone,
    reaction_counts jsonb,
    total_reactions bigint,
    comment_count bigint,
    is_viral boolean,
    user_reactions text[]
)
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_university text := nullif(btrim(coalesce(p_university, '')), '');
    v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
    v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
    if v_user_id is null then
        raise exception 'not_authenticated';
    end if;

    return query
    with reaction_rollup as (
        select
            counts.confession_id,
            jsonb_object_agg(counts.emoji, counts.reaction_count) as reaction_counts,
            sum(counts.reaction_count)::bigint as total_reactions
        from (
            select cr.confession_id, cr.emoji, count(*)::bigint as reaction_count
            from public.confession_reactions cr
            group by cr.confession_id, cr.emoji
        ) counts
        group by counts.confession_id
    ),
    comment_rollup as (
        select cc.confession_id, count(*)::bigint as comment_count
        from public.confession_comments cc
        group by cc.confession_id
    )
    select
        c.id,
        c.content,
        c.university,
        c.created_at,
        coalesce(rr.reaction_counts, '{}'::jsonb) as reaction_counts,
        coalesce(rr.total_reactions, 0) as total_reactions,
        coalesce(cc.comment_count, 0) as comment_count,
        coalesce(rr.total_reactions, 0) >= 20 as is_viral,
        coalesce(
            array(
                select mine.emoji
                from public.confession_reactions mine
                where mine.confession_id = c.id
                  and mine.user_id = v_user_id
                order by mine.emoji
            ),
            '{}'::text[]
        ) as user_reactions
    from public.confessions c
    left join reaction_rollup rr on rr.confession_id = c.id
    left join comment_rollup cc on cc.confession_id = c.id
    where v_university is null or lower(c.university) = lower(v_university)
    order by c.is_pinned desc, c.created_at desc
    limit v_limit
    offset v_offset;
end;
$$;

create or replace function public.toggle_confession_reaction(
    p_confession_id uuid,
    p_emoji text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_existing_id uuid;
begin
    if v_user_id is null then
        return jsonb_build_object('success', false, 'error', 'not_authenticated');
    end if;

    if p_confession_id is null or nullif(btrim(coalesce(p_emoji, '')), '') is null then
        return jsonb_build_object('success', false, 'error', 'invalid_reaction');
    end if;

    if not exists (select 1 from public.confessions c where c.id = p_confession_id) then
        return jsonb_build_object('success', false, 'error', 'confession_not_found');
    end if;

    select cr.id
    into v_existing_id
    from public.confession_reactions cr
    where cr.confession_id = p_confession_id
      and cr.user_id = v_user_id
      and cr.emoji = p_emoji
    limit 1;

    if v_existing_id is not null then
        delete from public.confession_reactions
        where id = v_existing_id
          and user_id = v_user_id;

        return jsonb_build_object('success', true, 'toggled', false);
    end if;

    insert into public.confession_reactions (confession_id, user_id, emoji)
    values (p_confession_id, v_user_id, p_emoji);

    perform public.record_feed_impression('confession', p_confession_id, 'confession_reaction', true);

    return jsonb_build_object('success', true, 'toggled', true);
exception when others then
    return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

-- ---------------------------------------------------------------------------
-- Trigger resolution for the first staging scope
-- ---------------------------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists on_profile_created_referral on public.profiles;
create trigger on_profile_created_referral
before insert on public.profiles
for each row execute function public.handle_new_profile_referral();

drop trigger if exists tr_sync_referral on public.profiles;
create trigger tr_sync_referral
after insert or update of referred_by on public.profiles
for each row execute function public.sync_referral_from_profile();

drop trigger if exists track_photo_update on public.profiles;
create trigger track_photo_update
before update of avatar_url, photos, profile_photos on public.profiles
for each row execute function public.update_photo_timestamp();

drop trigger if exists calculate_profile_completion on public.profiles;
create trigger calculate_profile_completion
before insert or update on public.profiles
for each row execute function public.calculate_completion_score();

-- ---------------------------------------------------------------------------
-- Execution grants
-- ---------------------------------------------------------------------------

revoke all on function public.normalize_referral_code(text) from public, anon, authenticated;
revoke all on function public.generate_referral_code() from public, anon, authenticated;
revoke all on function public.generate_unique_referral_code() from public, anon, authenticated;
revoke all on function public.handle_new_profile_referral() from public, anon, authenticated;
revoke all on function public.sync_referral_from_profile() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.validate_referral_code(text) from public, anon, authenticated;
revoke all on function public.apply_referral_code(text) from public, anon, authenticated;
revoke all on function public.calculate_completion_score() from public, anon, authenticated;
revoke all on function public.update_photo_timestamp() from public, anon, authenticated;
revoke all on function public.get_current_profile() from public, anon, authenticated;
revoke all on function public.update_current_profile(jsonb) from public, anon, authenticated;
revoke all on function public.update_user_presence() from public, anon, authenticated;
revoke all on function public.check_and_reset_swipe_limit(uuid) from public, anon, authenticated;
revoke all on function public.get_discovery_profiles(integer, integer, jsonb) from public, anon, authenticated;
revoke all on function public.record_feed_impression(text, uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.record_profile_swipe(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.accept_swipe_request(uuid) from public, anon, authenticated;
revoke all on function public.get_leaderboard_profiles(text, integer) from public, anon, authenticated;
revoke all on function public.get_confession_feed(text, integer, integer) from public, anon, authenticated;
revoke all on function public.toggle_confession_reaction(uuid, text) from public, anon, authenticated;

grant execute on function public.validate_referral_code(text) to anon, authenticated;
grant execute on function public.apply_referral_code(text) to authenticated;
grant execute on function public.get_current_profile() to authenticated;
grant execute on function public.update_current_profile(jsonb) to authenticated;
grant execute on function public.update_user_presence() to authenticated;
grant execute on function public.check_and_reset_swipe_limit(uuid) to authenticated;
grant execute on function public.get_discovery_profiles(integer, integer, jsonb) to authenticated;
grant execute on function public.record_feed_impression(text, uuid, text, boolean) to authenticated;
grant execute on function public.record_profile_swipe(uuid, text, text, text, text) to authenticated;
grant execute on function public.accept_swipe_request(uuid) to authenticated;
grant execute on function public.get_leaderboard_profiles(text, integer) to authenticated;
grant execute on function public.get_confession_feed(text, integer, integer) to authenticated;
grant execute on function public.toggle_confession_reaction(uuid, text) to authenticated;
