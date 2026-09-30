-- Update get_admirers_secure and accept_swipe_request with to_jsonb
CREATE OR REPLACE FUNCTION public.get_admirers_secure(p_limit integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_is_premium boolean;
    v_total integer := 0;
    v_today_accepts_count integer := 0;
    v_free_accepts_remaining integer := 3;
    v_items jsonb := '[]'::jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'unauthorized',
            'message', 'Authentication required'
        );
    END IF;

    -- Check if user is premium
    v_is_premium := public.has_entitlement(v_user_id, 'premium');

    -- Count total pending swipes targeting the user
    SELECT count(*)::integer
    INTO v_total
    FROM public.swipes sw
    WHERE sw.swiped_id = v_user_id
      AND sw.status = 'pending';

    -- Count how many requests the user has accepted today (UTC)
    SELECT count(*)::integer
    INTO v_today_accepts_count
    FROM public.swipes sw
    WHERE sw.swiped_id = v_user_id
      AND sw.status = 'accepted'
      AND COALESCE(sw.updated_at, sw.created_at) >= (current_date at time zone 'UTC');

    IF v_is_premium THEN
        v_free_accepts_remaining := 999;
    ELSE
        v_free_accepts_remaining := GREATEST(0, 3 - v_today_accepts_count);
    END IF;

    IF NOT v_is_premium THEN
        -- For freemium users, unlock up to 3 admirers so they can accept/decline them, lock the rest
        SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
        INTO v_items
        FROM (
            SELECT
                CASE
                    WHEN row_number() over (ORDER BY coalesce(sw.is_priority, false) DESC, sw.created_at DESC) <= 3 THEN
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
                    ELSE
                        jsonb_build_object(
                            'id', sw.id,
                            'swiper_id', sw.swiper_id,
                            'swiped_id', sw.swiped_id,
                            'type', sw.type,
                            'status', sw.status,
                            'is_priority', coalesce(sw.is_priority, false),
                            'created_at', sw.created_at,
                            'locked', true,
                            'swiper', jsonb_build_object(
                                'full_name', 'Secret Admirer 🔒',
                                'university', p.university
                            )
                        )
                END as item
            FROM public.swipes sw
            JOIN public.profiles p ON p.id = sw.swiper_id
            WHERE sw.swiped_id = v_user_id
              AND sw.status = 'pending'
            ORDER BY coalesce(sw.is_priority, false) DESC, sw.created_at DESC
            LIMIT p_limit
        ) q;
    ELSE
        -- Premium: fully visible
        SELECT COALESCE(jsonb_agg(
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
        ), '[]'::jsonb)
        INTO v_items
        FROM public.swipes sw
        JOIN public.profiles p ON p.id = sw.swiper_id
        WHERE sw.swiped_id = v_user_id
          AND sw.status = 'pending'
        ORDER BY coalesce(sw.is_priority, false) DESC, sw.created_at DESC
        LIMIT p_limit;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'premium', v_is_premium,
        'upgrade_required', (NOT v_is_premium AND v_total > 3),
        'total_count', v_total,
        'free_accepts_remaining', v_free_accepts_remaining,
        'daily_limit', 3,
        'today_accepts_count', v_today_accepts_count,
        'items', v_items
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admirers_secure(integer) TO authenticated;
