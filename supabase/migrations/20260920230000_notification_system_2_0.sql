-- Migration: Notification System 2.0
-- 1. Hardens insert_notification to support privacy-preserving anonymous messages and system notifications
-- 2. Hardens accept_swipe_request to automatically dispatch match notification to requester

CREATE OR REPLACE FUNCTION public.insert_notification(
    p_user_id uuid,
    p_actor_id uuid,
    p_type text,
    p_title text,
    p_content text,
    p_metadata jsonb default '{}'::jsonb,
    p_category text default null,
    p_entity_type text default null,
    p_entity_id uuid default null,
    p_parent_entity_id uuid default null,
    p_conversation_id uuid default null,
    p_match_id uuid default null,
    p_deep_link text default null,
    p_priority text default 'normal',
    p_group_key text default null,
    p_dedupe_key text default null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result jsonb;
    v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
    v_deep_link text := coalesce(nullif(p_deep_link, ''), v_metadata->>'url');
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    IF p_actor_id IS NOT NULL AND p_actor_id <> auth.uid() THEN
        RAISE EXCEPTION 'Notification actor must be the current user';
    END IF;

    IF p_actor_id IS NULL AND p_user_id <> auth.uid() THEN
        -- Allow anonymous interactions, confessions, and system notifications without actor leakage
        IF NOT (
            p_type IN ('snapshot_reaction', 'confession', 'system', 'announcement', 'request_reminder')
            OR (v_metadata->>'is_anonymous') = 'true'
        ) THEN
            RAISE EXCEPTION 'System-style notifications can only target the current user';
        END IF;
    END IF;

    INSERT INTO public.notifications (
        user_id,
        recipient_id,
        actor_id,
        sender_id,
        type,
        category,
        entity_type,
        entity_id,
        parent_entity_id,
        conversation_id,
        match_id,
        title,
        content,
        deep_link,
        priority,
        group_key,
        dedupe_key,
        metadata
    )
    VALUES (
        p_user_id,
        p_user_id,
        p_actor_id,
        p_actor_id,
        p_type,
        p_category,
        p_entity_type,
        p_entity_id,
        p_parent_entity_id,
        p_conversation_id,
        p_match_id,
        p_title,
        p_content,
        v_deep_link,
        coalesce(nullif(p_priority, ''), 'normal'),
        p_group_key,
        p_dedupe_key,
        v_metadata
    )
    ON CONFLICT (user_id, dedupe_key)
    DO UPDATE SET
        updated_at = now()
    RETURNING to_jsonb(notifications.*) INTO result;

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_notification(uuid, uuid, text, text, text, jsonb, text, text, uuid, uuid, uuid, uuid, text, text, text, text) TO authenticated, anon;

-- Update accept_swipe_request to automatically notify the swiper that their request was accepted
CREATE OR REPLACE FUNCTION public.accept_swipe_request(p_swipe_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_swiper_id uuid;
    v_swiped_id uuid;
    v_is_premium boolean;
    v_today_accepts_count integer := 0;
    v_match_id uuid;
    v_participants uuid[];
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'unauthorized',
            'message', 'Authentication required'
        );
    END IF;

    -- Retrieve swipe and verify ownership
    SELECT swiper_id, swiped_id
    INTO v_swiper_id, v_swiped_id
    FROM public.swipes
    WHERE id = p_swipe_id
      AND swiped_id = v_user_id
      AND status = 'pending';

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'request_not_found',
            'message', 'This connection request was not found or has already been actioned.'
        );
    END IF;

    -- Check user premium status
    v_is_premium := public.has_entitlement(v_user_id, 'premium');

    -- If not premium, verify daily quota of 3 free accepts
    IF NOT v_is_premium THEN
        SELECT count(*)::integer
        INTO v_today_accepts_count
        FROM public.swipes sw
        WHERE sw.swiped_id = v_user_id
          AND sw.status = 'accepted'
          AND COALESCE(sw.updated_at, sw.created_at) >= (current_date at time zone 'UTC');

        IF v_today_accepts_count >= 3 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'daily_limit_reached',
                'message', 'You have used your 3 free accepts for today. Upgrade to Premium for unlimited accepts!'
            );
        END IF;
    END IF;

    -- Accept swipe and update timestamp
    UPDATE public.swipes
    SET status = 'accepted',
        updated_at = now()
    WHERE id = p_swipe_id;

    v_participants := array[least(v_swiper_id, v_swiped_id), greatest(v_swiper_id, v_swiped_id)]::uuid[];

    INSERT INTO public.matches (user1_id, user2_id, user_ids, created_at)
    VALUES (v_participants[1], v_participants[2], v_participants, now())
    ON CONFLICT (user1_id, user2_id) DO UPDATE
    SET user_ids = EXCLUDED.user_ids
    RETURNING id INTO v_match_id;

    -- Authoritative Match Notification dispatched to the requester (User A)
    BEGIN
        INSERT INTO public.notifications (
            user_id,
            recipient_id,
            actor_id,
            sender_id,
            type,
            category,
            entity_type,
            entity_id,
            match_id,
            conversation_id,
            title,
            content,
            deep_link,
            priority,
            group_key,
            dedupe_key,
            metadata
        ) VALUES (
            v_swiper_id,
            v_swiper_id,
            v_user_id,
            v_user_id,
            'match',
            'matches',
            'match',
            v_match_id,
            v_match_id,
            v_match_id,
            '🔥 Connection Accepted!',
            'Someone accepted your connection request! Tap to start chatting.',
            '/chat?chatId=' || v_match_id::text,
            'high',
            'match:' || v_match_id::text,
            'match_accepted:' || p_swipe_id::text,
            jsonb_build_object('match_id', v_match_id, 'url', '/chat?chatId=' || v_match_id::text, 'swipe_id', p_swipe_id)
        )
        ON CONFLICT (user_id, dedupe_key) DO UPDATE SET updated_at = now();
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'match_id', v_match_id,
        'remaining_accepts', CASE WHEN v_is_premium THEN 999 ELSE GREATEST(0, 2 - COALESCE(v_today_accepts_count, 0)) END
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_swipe_request(uuid) TO authenticated;
