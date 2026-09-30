-- Migration: 20260907170000_production_hardening_core.sql
-- Purpose:
-- 1. Add matches and swipes to supabase_realtime publication
-- 2. Set REPLICA IDENTITY FULL for messages, matches, swipes
-- 3. Atomic message reaction toggle RPC (toggle_message_reaction)
-- 4. Secure message edit RPC (edit_chat_message)
-- 5. Secure message soft-delete RPC (delete_chat_message)
-- 6. Real-time call signaling fields and RPCs (initiate_call_signal, respond_call_signal)

-- 1. Publications & Replica Identity
DO $$
BEGIN
    -- Add matches to supabase_realtime if not already present
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'matches'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
    END IF;

    -- Add swipes to supabase_realtime if not already present
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'swipes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.swipes;
    END IF;
END $$;

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.matches REPLICA IDENTITY FULL;
ALTER TABLE public.swipes REPLICA IDENTITY FULL;

-- Ensure grants on public.messages
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.messages TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.matches TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.swipes TO authenticated;

-- Add call signaling fields to matches table
ALTER TABLE public.matches
    ADD COLUMN IF NOT EXISTS call_state text DEFAULT 'idle',
    ADD COLUMN IF NOT EXISTS call_type text DEFAULT 'voice',
    ADD COLUMN IF NOT EXISTS caller_id uuid REFERENCES public.profiles(id),
    ADD COLUMN IF NOT EXISTS call_updated_at timestamptz DEFAULT now();

-- 2. Atomic Message Reaction RPC
CREATE OR REPLACE FUNCTION public.toggle_message_reaction(
    p_message_id uuid,
    p_emoji text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_match_id uuid;
    v_metadata jsonb;
    v_reactions jsonb;
    v_key text;
    v_users jsonb;
    v_new_users jsonb;
    v_prev_had_this_emoji boolean := false;
    v_updated_reactions jsonb := '{}'::jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    -- Fetch message and ensure caller is a participant in this match
    SELECT m.match_id, coalesce(m.metadata, '{}'::jsonb)
    INTO v_match_id, v_metadata
    FROM public.messages m
    JOIN public.matches mat ON mat.id = m.match_id
    WHERE m.id = p_message_id
      AND v_user_id IN (mat.user1_id, mat.user2_id);

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Message not found or unauthorized');
    END IF;

    v_reactions := coalesce(v_metadata->'reactions', '{}'::jsonb);

    -- Loop through all existing reactions: remove v_user_id from every emoji
    FOR v_key IN SELECT jsonb_object_keys(v_reactions)
    LOOP
        v_users := v_reactions->v_key;
        IF jsonb_typeof(v_users) = 'array' THEN
            -- Check if user already had this specific emoji
            IF v_key = p_emoji AND v_users @> to_jsonb(v_user_id::text) THEN
                v_prev_had_this_emoji := true;
            END IF;

            -- Filter out v_user_id
            SELECT coalesce(jsonb_agg(elem), '[]'::jsonb)
            INTO v_new_users
            FROM jsonb_array_elements_text(v_users) elem
            WHERE elem <> v_user_id::text;

            -- Only retain if there are remaining users
            IF jsonb_array_length(v_new_users) > 0 THEN
                v_updated_reactions := v_updated_reactions || jsonb_build_object(v_key, v_new_users);
            END IF;
        END IF;
    END LOOP;

    -- If the user did NOT previously have this emoji, add them now (toggle on or change)
    IF NOT v_prev_had_this_emoji AND p_emoji IS NOT NULL AND trim(p_emoji) <> '' THEN
        v_users := coalesce(v_updated_reactions->p_emoji, '[]'::jsonb);
        v_new_users := v_users || to_jsonb(v_user_id::text);
        v_updated_reactions := v_updated_reactions || jsonb_build_object(p_emoji, v_new_users);
    END IF;

    -- Update the message metadata
    v_metadata := jsonb_set(v_metadata, '{reactions}', v_updated_reactions);

    UPDATE public.messages
    SET metadata = v_metadata
    WHERE id = p_message_id;

    RETURN jsonb_build_object(
        'success', true,
        'message_id', p_message_id,
        'reactions', v_updated_reactions
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_message_reaction(uuid, text) TO authenticated;

-- 3. Secure Message Edit RPC
CREATE OR REPLACE FUNCTION public.edit_chat_message(
    p_message_id uuid,
    p_new_content text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_msg record;
    v_metadata jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    IF p_new_content IS NULL OR trim(p_new_content) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Message content cannot be empty');
    END IF;

    SELECT id, sender_id, created_at, type, metadata
    INTO v_msg
    FROM public.messages
    WHERE id = p_message_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Message not found');
    END IF;

    IF v_msg.sender_id <> v_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'You can only edit your own messages');
    END IF;

    IF v_msg.type = 'deleted' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot edit a deleted message');
    END IF;

    IF v_msg.created_at < (now() - interval '15 minutes') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Messages can only be edited within 15 minutes of sending');
    END IF;

    v_metadata := coalesce(v_msg.metadata, '{}'::jsonb);
    v_metadata := jsonb_set(v_metadata, '{is_edited}', 'true'::jsonb);
    v_metadata := jsonb_set(v_metadata, '{edited_at}', to_jsonb(now()::text));

    UPDATE public.messages
    SET content = trim(p_new_content),
        metadata = v_metadata
    WHERE id = p_message_id;

    RETURN jsonb_build_object(
        'success', true,
        'message_id', p_message_id,
        'content', trim(p_new_content),
        'metadata', v_metadata
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.edit_chat_message(uuid, text) TO authenticated;

-- 4. Secure Message Soft-Delete RPC
CREATE OR REPLACE FUNCTION public.delete_chat_message(
    p_message_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_msg record;
    v_metadata jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT id, sender_id, metadata
    INTO v_msg
    FROM public.messages
    WHERE id = p_message_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Message not found');
    END IF;

    IF v_msg.sender_id <> v_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'You can only delete your own messages');
    END IF;

    v_metadata := coalesce(v_msg.metadata, '{}'::jsonb);
    v_metadata := jsonb_set(v_metadata, '{is_deleted}', 'true'::jsonb);
    v_metadata := jsonb_set(v_metadata, '{deleted_at}', to_jsonb(now()::text));

    UPDATE public.messages
    SET type = 'deleted',
        content = 'This message was deleted',
        metadata = v_metadata
    WHERE id = p_message_id;

    RETURN jsonb_build_object(
        'success', true,
        'message_id', p_message_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_chat_message(uuid) TO authenticated;

-- 5. Real-Time Call Signaling RPCs
CREATE OR REPLACE FUNCTION public.initiate_call_signal(
    p_match_id uuid,
    p_call_type text DEFAULT 'voice'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_recipient_id uuid;
    v_caller_name text;
    v_caller_avatar text;
    v_user1 uuid;
    v_user2 uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT user1_id, user2_id INTO v_user1, v_user2
    FROM public.matches
    WHERE id = p_match_id AND (user1_id = v_user_id OR user2_id = v_user_id);

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Match not found');
    END IF;

    v_recipient_id := CASE WHEN v_user1 = v_user_id THEN v_user2 ELSE v_user1 END;

    SELECT full_name, avatar_url INTO v_caller_name, v_caller_avatar
    FROM public.profiles
    WHERE id = v_user_id;

    -- Update match call state
    UPDATE public.matches
    SET call_state = 'ringing',
        call_type = coalesce(p_call_type, 'voice'),
        caller_id = v_user_id,
        call_updated_at = now()
    WHERE id = p_match_id;

    -- Create high-priority incoming call notification for recipient
    INSERT INTO public.notifications (
        user_id,
        actor_id,
        type,
        title,
        content,
        priority,
        metadata
    ) VALUES (
        v_recipient_id,
        v_user_id,
        'call',
        'Incoming ' || CASE WHEN p_call_type = 'video' THEN 'Video' ELSE 'Voice' END || ' Call',
        coalesce(v_caller_name, 'Someone') || ' is calling you...',
        'critical',
        jsonb_build_object(
            'match_id', p_match_id,
            'call_type', coalesce(p_call_type, 'voice'),
            'caller_id', v_user_id,
            'caller_name', v_caller_name,
            'caller_avatar', v_caller_avatar
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'match_id', p_match_id,
        'call_state', 'ringing',
        'recipient_id', v_recipient_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.initiate_call_signal(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.respond_call_signal(
    p_match_id uuid,
    p_action text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_match record;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    IF p_action NOT IN ('accepted', 'rejected', 'ended', 'busy') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid call action');
    END IF;

    SELECT id, user1_id, user2_id, caller_id, call_state
    INTO v_match
    FROM public.matches
    WHERE id = p_match_id AND (user1_id = v_user_id OR user2_id = v_user_id);

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Match not found');
    END IF;

    UPDATE public.matches
    SET call_state = p_action,
        call_updated_at = now()
    WHERE id = p_match_id;

    RETURN jsonb_build_object(
        'success', true,
        'match_id', p_match_id,
        'call_state', p_action
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_call_signal(uuid, text) TO authenticated;
