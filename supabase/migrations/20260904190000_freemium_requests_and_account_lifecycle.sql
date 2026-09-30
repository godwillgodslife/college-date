-- Migration: 20260904190000_freemium_requests_and_account_lifecycle.sql
-- Enables 3 daily free request accepts for freemium users and adds account deactivation / deletion RPCs.

create or replace function public.get_admirers_secure(p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_is_premium boolean;
    v_total integer;
    v_today_accepts_count integer;
    v_free_accepts_remaining integer;
    v_items jsonb;
begin
    if v_user_id is null then
        return jsonb_build_object('success', false, 'error', 'Not authenticated');
    end if;

    v_is_premium := public.has_entitlement(v_user_id, 'see_admirers')
        or public.has_entitlement(v_user_id, 'premium');

    -- Count total pending swipes targeting the user
    select count(*)::integer
    into v_total
    from public.swipes sw
    where sw.swiped_id = v_user_id
      and sw.status = 'pending';

    -- Count how many requests the user has accepted today (UTC)
    select count(*)::integer
    into v_today_accepts_count
    from public.swipes sw
    where sw.swiped_id = v_user_id
      and sw.status = 'accepted'
      and sw.updated_at >= (current_date at time zone 'UTC');

    if v_is_premium then
        v_free_accepts_remaining := 999;
    else
        v_free_accepts_remaining := greatest(0, 3 - v_today_accepts_count);
    end if;

    if not v_is_premium then
        -- For freemium users, unlock up to 3 admirers so they can accept/decline them, lock the rest
        select coalesce(jsonb_agg(item), '[]'::jsonb)
        into v_items
        from (
            select
                case
                    when row_number() over (order by coalesce(sw.is_priority, false) desc, sw.created_at desc) <= 3 then
                        jsonb_build_object(
                            'id', sw.id,
                            'swiper_id', sw.swiper_id,
                            'swiped_id', sw.swiped_id,
                            'type', sw.type,
                            'status', sw.status,
                            'is_priority', coalesce(sw.is_priority, false),
                            'message_teaser', sw.message_teaser,
                            'created_at', sw.created_at,
                            'locked', false,
                            'swiper', to_jsonb(p)
                        )
                    else
                        jsonb_build_object(
                            'created_at', sw.created_at,
                            'is_priority', coalesce(sw.is_priority, false),
                            'locked', true
                        )
                end as item
            from public.swipes sw
            join public.profiles p on p.id = sw.swiper_id
            where sw.swiped_id = v_user_id
              and sw.status = 'pending'
            order by coalesce(sw.is_priority, false) desc, sw.created_at desc
            limit greatest(1, least(coalesce(p_limit, 50), 100))
        ) locked_items;

        return jsonb_build_object(
            'success', true,
            'premium', false,
            'upgrade_required', v_total > 3 or v_free_accepts_remaining = 0,
            'total_count', v_total,
            'today_accepts_count', v_today_accepts_count,
            'free_accepts_remaining', v_free_accepts_remaining,
            'daily_limit', 3,
            'items', coalesce(v_items, '[]'::jsonb)
        );
    end if;

    -- Premium user: return all admirers fully unlocked
    select coalesce(jsonb_agg(item), '[]'::jsonb)
    into v_items
    from (
        select jsonb_build_object(
            'id', sw.id,
            'swiper_id', sw.swiper_id,
            'swiped_id', sw.swiped_id,
            'type', sw.type,
            'status', sw.status,
            'is_priority', coalesce(sw.is_priority, false),
            'message_teaser', sw.message_teaser,
            'created_at', sw.created_at,
            'locked', false,
            'swiper', to_jsonb(p)
        ) as item
        from public.swipes sw
        join public.profiles p on p.id = sw.swiper_id
        where sw.swiped_id = v_user_id
          and sw.status = 'pending'
        order by coalesce(sw.is_priority, false) desc, sw.created_at desc
        limit greatest(1, least(coalesce(p_limit, 50), 100))
    ) unlocked_items;

    return jsonb_build_object(
        'success', true,
        'premium', true,
        'upgrade_required', false,
        'total_count', v_total,
        'today_accepts_count', v_today_accepts_count,
        'free_accepts_remaining', 999,
        'daily_limit', 999,
        'items', coalesce(v_items, '[]'::jsonb)
    );
end;
$$;

grant execute on function public.get_admirers_secure(integer) to authenticated;

-- Hardened accept_swipe_request with 3 free daily accepts check for freemium
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
    v_is_premium boolean;
    v_today_accepts_count integer;
begin
    if v_user_id is null then
        return jsonb_build_object('success', false, 'error', 'not_authenticated');
    end if;

    -- Check if swipe exists, belongs to caller, and is pending
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

    -- Check user premium status
    v_is_premium := public.has_entitlement(v_user_id, 'premium');

    -- If not premium, verify daily quota of 3 free accepts
    if not v_is_premium then
        select count(*)::integer
        into v_today_accepts_count
        from public.swipes sw
        where sw.swiped_id = v_user_id
          and sw.status = 'accepted'
          and sw.updated_at >= (current_date at time zone 'UTC');

        if v_today_accepts_count >= 3 then
            return jsonb_build_object(
                'success', false,
                'error', 'daily_limit_reached',
                'message', 'You have used your 3 free accepts for today. Upgrade to Premium for unlimited accepts!'
            );
        end if;
    end if;

    -- Accept swipe
    update public.swipes
    set status = 'accepted',
        updated_at = now()
    where id = p_swipe_id;

    v_participants := array[least(v_swiper_id, v_swiped_id), greatest(v_swiper_id, v_swiped_id)]::uuid[];

    insert into public.matches (user1_id, user2_id, user_ids, created_at)
    values (v_participants[1], v_participants[2], v_participants, now())
    on conflict (user1_id, user2_id) do update
    set user_ids = excluded.user_ids
    returning id into v_match_id;

    return jsonb_build_object(
        'success', true,
        'match_id', v_match_id,
        'remaining_accepts', case when v_is_premium then 999 else greatest(0, 2 - coalesce(v_today_accepts_count, 0)) end
    );
exception when others then
    return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

grant execute on function public.accept_swipe_request(uuid) to authenticated;

-- Deactivate User Account RPC
create or replace function public.deactivate_user_account()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
begin
    if v_user_id is null then
        return jsonb_build_object('success', false, 'error', 'not_authenticated');
    end if;

    update public.profiles
    set incognito_mode = true,
        is_online = false,
        status_text = 'deactivated',
        updated_at = now()
    where id = v_user_id;

    return jsonb_build_object('success', true, 'message', 'Account deactivated successfully');
end;
$$;

grant execute on function public.deactivate_user_account() to authenticated;

-- Delete User Account RPC (Data Safety compliance)
create or replace function public.delete_user_account()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
begin
    if v_user_id is null then
        return jsonb_build_object('success', false, 'error', 'not_authenticated');
    end if;

    -- Anonymize and disable profile
    update public.profiles
    set full_name = 'Deleted Account',
        username = 'deleted_' || substr(v_user_id::text, 1, 8),
        bio = 'This account has been deleted.',
        avatar_url = null,
        profile_photos = '{}',
        phone = null,
        incognito_mode = true,
        is_banned = true,
        is_online = false,
        status_text = 'deleted',
        updated_at = now()
    where id = v_user_id;

    -- Clean up pending requests
    delete from public.swipes
    where swiped_id = v_user_id and status = 'pending';

    return jsonb_build_object('success', true, 'message', 'Account deleted successfully');
end;
$$;

grant execute on function public.delete_user_account() to authenticated;
