-- ============================================================================
-- Migration: Include profile photos and timestamps in get_profile_viewers_secure
-- Ensures profile_photos and photo_updated_at are projected so getAvatarUrl
-- resolves authentic photos for viewers on web and mobile clients.
-- ============================================================================

create or replace function public.get_profile_viewers_secure(p_limit integer default 20)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_is_premium boolean;
    v_total integer;
    v_items jsonb;
begin
    if v_user_id is null then
        return jsonb_build_object('success', false, 'error', 'Not authenticated');
    end if;

    v_is_premium := public.has_entitlement(v_user_id, 'see_profile_viewers')
        or public.has_entitlement(v_user_id, 'premium');

    select count(*)::integer
    into v_total
    from public.profile_views pv
    where pv.profile_owner_id = v_user_id;

    if not v_is_premium then
        select coalesce(jsonb_agg(item), '[]'::jsonb)
        into v_items
        from (
            select jsonb_build_object(
                'created_at', pv.created_at,
                'locked', true
            ) as item
            from public.profile_views pv
            where pv.profile_owner_id = v_user_id
            order by pv.created_at desc
            limit greatest(1, least(coalesce(p_limit, 20), 50))
        ) locked_items;

        return jsonb_build_object(
            'success', true,
            'premium', false,
            'upgrade_required', v_total > 0,
            'total_count', v_total,
            'items', coalesce(v_items, '[]'::jsonb)
        );
    end if;

    select coalesce(jsonb_agg(item), '[]'::jsonb)
    into v_items
    from (
        select jsonb_build_object(
            'id', pv.id,
            'created_at', pv.created_at,
            'viewer', jsonb_build_object(
                'id', p.id,
                'full_name', p.full_name,
                'avatar_url', p.avatar_url,
                'profile_photos', p.profile_photos,
                'photo_updated_at', p.photo_updated_at,
                'university', p.university,
                'last_active', p.last_active
            ),
            'locked', false
        ) as item
        from public.profile_views pv
        join public.profiles p on p.id = pv.viewer_id
        where pv.profile_owner_id = v_user_id
        order by pv.created_at desc
        limit greatest(1, least(coalesce(p_limit, 20), 50))
    ) unlocked_items;

    return jsonb_build_object(
        'success', true,
        'premium', true,
        'upgrade_required', false,
        'total_count', v_total,
        'items', coalesce(v_items, '[]'::jsonb)
    );
end;
$$;

grant execute on function public.get_profile_viewers_secure(integer) to authenticated;
