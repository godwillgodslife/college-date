-- FIX: Create missing RPC function 'get_hidden_content_counts'

-- 1. Drop it just in case it exists in a weird state
DROP FUNCTION IF EXISTS get_hidden_content_counts(UUID);

-- 2. Create the function
CREATE OR REPLACE FUNCTION get_hidden_content_counts(v_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_hidden_statuses INTEGER;
    v_hidden_snapshots INTEGER;
    v_24h TIMESTAMP WITH TIME ZONE := now() - INTERVAL '24 hours';
BEGIN
    -- Count statuses the user CANNOT see (not own, no accepted swipe)
    SELECT COUNT(*) INTO v_hidden_statuses
    FROM public.statuses
    WHERE created_at > v_24h
    AND user_id != v_user_id
    AND NOT EXISTS (
        SELECT 1 FROM public.swipes
        WHERE (
            (swiper_id = v_user_id AND swiped_id = statuses.user_id)
            OR (swiped_id = v_user_id AND swiper_id = statuses.user_id)
        )
        AND status = 'accepted'
    );

    -- Count snapshots the user CANNOT see
    SELECT COUNT(*) INTO v_hidden_snapshots
    FROM public.snapshots
    WHERE created_at > v_24h
    AND user_id != v_user_id
    AND NOT EXISTS (
        SELECT 1 FROM public.swipes
        WHERE (
            (swiper_id = v_user_id AND swiped_id = snapshots.user_id)
            OR (swiped_id = v_user_id AND swiper_id = snapshots.user_id)
        )
        AND status = 'accepted'
    );

    RETURN jsonb_build_object(
        'hidden_statuses', v_hidden_statuses,
        'hidden_snapshots', v_hidden_snapshots
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
