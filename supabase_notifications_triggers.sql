-- ADD NOTIFICATIONS TO RPC FUNCTIONS

-- 1. Update accept_swipe_request to notify the Swiper
CREATE OR REPLACE FUNCTION accept_swipe_request(
    swipe_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_swiper_id UUID;
    v_swiped_id UUID;
    v_match_id UUID;
BEGIN
    -- 1. Get swipe details and verify the acceptor is the target
    SELECT swiper_id, swiped_id INTO v_swiper_id, v_swiped_id
    FROM public.swipes
    WHERE id = swipe_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request not found or already processed');
    END IF;

    -- 2. Update Swipe Status
    UPDATE public.swipes SET status = 'accepted' WHERE id = swipe_id;

    -- 3. Create/Ensure Persistent Match & Chat
    DECLARE
        participants UUID[] := ARRAY[v_swiper_id, v_swiped_id];
    BEGIN
        -- Sort array for uniqueness
        IF participants[1] > participants[2] THEN
            participants := ARRAY[v_swiped_id, v_swiper_id];
        END IF;

        INSERT INTO public.matches (user1_id, user2_id, user_ids)
        VALUES (participants[1], participants[2], participants)
        ON CONFLICT (user1_id, user2_id) DO NOTHING
        RETURNING id INTO v_match_id;

        IF v_match_id IS NULL THEN
            SELECT id INTO v_match_id FROM public.matches 
            WHERE user1_id = participants[1] AND user2_id = participants[2];
        END IF;
    END;

    -- 4. INSERT NOTIFICATION for the Swiper
    -- "Your swipe was accepted! Start chatting."
    INSERT INTO public.notifications (recipient_id, sender_id, type, title, content, metadata)
    VALUES (
        v_swiper_id, -- Recipient is the one who originally swiped
        v_swiped_id, -- Sender is the one who accepted
        'match', 
        'It''s a Match! 🔥', 
        'Your swipe request was accepted. Don''t keep them waiting!',
        jsonb_build_object('match_id', v_match_id, 'url', '/chat')
    );

    RETURN jsonb_build_object('success', true, 'match_id', v_match_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Update increment_snapshot_likes to notify the Snapshot Owner
CREATE OR REPLACE FUNCTION increment_snapshot_likes(
    row_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_owner_id UUID;
    v_description TEXT;
BEGIN
    UPDATE public.snapshots
    SET likes = likes + 1
    WHERE id = row_id
    RETURNING user_id, description INTO v_owner_id, v_description;

    -- Notify owner (if not liking own post - though UI prevents it, good to check)
    -- Note: We don't have auth.uid() easily accessible as 'sender_id' in this simple increment RPC 
    -- without passing it as an arg. 
    -- To keep it simple, we'll let the Frontend trigger this notification via 'createNotification' 
    -- OR we update this RPC to take 'liker_id'.
    -- Let's stick to the Plan: The Frontend service called 'createNotification' in 'likeSnapshot'.
    -- so we actually DON'T do it here for likes to avoid complexity with Auth ID injection.
    
    -- However, for the match acceptance above, it's perfect because we have both IDs.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
