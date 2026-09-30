-- Migration: 20260930190000_message_interactions_and_lifecycle.sql
-- Purpose:
-- 1. Ensure seen_at column exists on public.messages and auto-syncs with read_at
-- 2. Trigger to set read_at and seen_at automatically when is_read becomes true
-- 3. Update RLS policy to filter out messages soft-deleted for the current user (deleted_for)
-- 4. Secure RPC edit_chat_message:
--    - Enforce text-only editing
--    - Sender only
--    - Reject if recipient has seen/read the message ('Cannot edit a message that has already been seen')
--    - Enforce 15-minute edit window
--    - Update content and metadata (is_edited, edited_at)
-- 5. Secure RPC delete_chat_message / delete_chat_message_for_everyone:
--    - Sender only
--    - Reject if recipient has seen/read the message ('Cannot delete for everyone after message has been seen')
--    - Set type = 'deleted', content = 'This message was deleted', metadata (is_deleted, deleted_at)
-- 6. Secure RPC delete_chat_message_for_me:
--    - Any match participant
--    - Append auth.uid() to metadata->'deleted_for'
-- 7. Update get_native_messages and get_native_conversations to filter out messages where user is in deleted_for

-- 1. Schema Extensions & Backfills
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS seen_at timestamptz;

UPDATE public.messages
SET seen_at = read_at
WHERE seen_at IS NULL AND read_at IS NOT NULL;

UPDATE public.messages
SET read_at = seen_at
WHERE read_at IS NULL AND seen_at IS NOT NULL;

-- 2. Trigger for read_at / seen_at auto-synchronization
CREATE OR REPLACE FUNCTION public.sync_message_read_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.is_read = true THEN
        IF NEW.read_at IS NULL THEN
            NEW.read_at := coalesce(OLD.read_at, now());
        END IF;
        IF NEW.seen_at IS NULL THEN
            NEW.seen_at := NEW.read_at;
        END IF;
    END IF;

    IF NEW.read_at IS NOT NULL AND NEW.seen_at IS NULL THEN
        NEW.seen_at := NEW.read_at;
    ELSIF NEW.seen_at IS NOT NULL AND NEW.read_at IS NULL THEN
        NEW.read_at := NEW.seen_at;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_message_read_state ON public.messages;
CREATE TRIGGER trigger_sync_message_read_state
BEFORE INSERT OR UPDATE OF is_read, read_at, seen_at ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.sync_message_read_state();

-- 3. Performance indexing for deleted_for and message lookups
CREATE INDEX IF NOT EXISTS idx_messages_metadata_deleted_for
ON public.messages USING gin ((metadata->'deleted_for'))
WHERE (metadata->'deleted_for') IS NOT NULL;

-- 4. Participant RLS Policy (Filtering out messages deleted for the current user)
DROP POLICY IF EXISTS "Native match participants can read messages" ON public.messages;
CREATE POLICY "Native match participants can read messages"
ON public.messages
FOR SELECT
TO authenticated
USING (
    private.is_match_participant(match_id)
    AND (expires_at IS NULL OR expires_at > now())
    AND NOT (coalesce(metadata->'deleted_for', '[]'::jsonb) @> to_jsonb(auth.uid()::text))
);

-- 5. Secure Message Edit RPC
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

    SELECT id, match_id, sender_id, created_at, type, metadata, is_read, read_at, seen_at
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

    -- Disallow editing on media messages. Only text messages can be edited.
    IF coalesce(v_msg.type, 'text') <> 'text' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only text messages can be edited');
    END IF;

    -- Strict enforcement: sender can ONLY edit if the recipient has NOT seen/read the message
    IF coalesce(v_msg.is_read, false) = true OR v_msg.read_at IS NOT NULL OR v_msg.seen_at IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot edit a message that has already been seen');
    END IF;

    -- Messages can only be edited within 15 minutes of sending
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

-- 6. Secure Message Delete for Everyone RPC
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

    SELECT id, match_id, sender_id, created_at, type, metadata, is_read, read_at, seen_at
    INTO v_msg
    FROM public.messages
    WHERE id = p_message_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Message not found');
    END IF;

    IF v_msg.sender_id <> v_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'You can only delete your own messages');
    END IF;

    IF v_msg.type = 'deleted' THEN
        RETURN jsonb_build_object('success', true, 'message_id', p_message_id, 'already_deleted', true);
    END IF;

    -- Strict enforcement: sender can ONLY delete for everyone if the recipient has NOT seen/read the message
    IF coalesce(v_msg.is_read, false) = true OR v_msg.read_at IS NOT NULL OR v_msg.seen_at IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot delete for everyone after message has been seen');
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

-- Alias RPC: delete_chat_message_for_everyone
CREATE OR REPLACE FUNCTION public.delete_chat_message_for_everyone(
    p_message_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN public.delete_chat_message(p_message_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_chat_message_for_everyone(uuid) TO authenticated;

-- 7. Secure Message Delete for Me RPC
CREATE OR REPLACE FUNCTION public.delete_chat_message_for_me(
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
    v_deleted_for jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT m.id, m.match_id, m.metadata
    INTO v_msg
    FROM public.messages m
    JOIN public.matches mat ON mat.id = m.match_id
    WHERE m.id = p_message_id
      AND v_user_id IN (mat.user1_id, mat.user2_id);

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Message not found or unauthorized');
    END IF;

    v_metadata := coalesce(v_msg.metadata, '{}'::jsonb);
    v_deleted_for := coalesce(v_metadata->'deleted_for', '[]'::jsonb);

    IF NOT (v_deleted_for @> to_jsonb(v_user_id::text)) THEN
        v_metadata := jsonb_set(v_metadata, '{deleted_for}', v_deleted_for || to_jsonb(v_user_id::text));
        UPDATE public.messages
        SET metadata = v_metadata
        WHERE id = p_message_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message_id', p_message_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_chat_message_for_me(uuid) TO authenticated;

-- 8. Synchronize get_native_messages to filter out messages where user is in deleted_for
CREATE OR REPLACE FUNCTION public.get_native_messages(
    p_match_id uuid,
    p_before timestamptz default null,
    p_limit integer default 50
)
RETURNS TABLE(
    id uuid,
    match_id uuid,
    sender_id uuid,
    content text,
    type text,
    is_read boolean,
    created_at timestamptz,
    read_at timestamptz,
    expires_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'not_authenticated';
    END IF;

    IF NOT private.is_match_participant(p_match_id) THEN
        RAISE EXCEPTION 'not_authorized';
    END IF;

    RETURN QUERY
    SELECT page.id,
           page.match_id,
           page.sender_id,
           page.content,
           page.type,
           page.is_read,
           page.created_at,
           page.read_at,
           page.expires_at
    FROM (
        SELECT msg.id,
               msg.match_id,
               msg.sender_id,
               msg.content,
               coalesce(msg.type, 'text') AS type,
               coalesce(msg.is_read, false) AS is_read,
               msg.created_at,
               coalesce(msg.read_at, msg.seen_at) AS read_at,
               msg.expires_at
        FROM public.messages msg
        WHERE msg.match_id = p_match_id
          AND (p_before IS NULL OR msg.created_at < p_before)
          AND (msg.expires_at IS NULL OR msg.expires_at > now())
          AND NOT (coalesce(msg.metadata->'deleted_for', '[]'::jsonb) @> to_jsonb(v_user_id::text))
        ORDER BY msg.created_at DESC, msg.id DESC
        LIMIT v_limit
    ) page
    ORDER BY page.created_at, page.id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_native_messages(uuid, timestamptz, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_native_messages(uuid, timestamptz, integer) TO authenticated;

-- 9. Synchronize get_native_conversations to ignore deleted_for in previews and unread counts
CREATE OR REPLACE FUNCTION public.get_native_conversations(
    p_limit integer default 50,
    p_offset integer default 0
)
RETURNS TABLE(
    match_id uuid,
    other_user_id uuid,
    other_display_name text,
    other_avatar_url text,
    other_last_active timestamptz,
    last_message_id uuid,
    last_message_content text,
    last_message_type text,
    last_message_sender_id uuid,
    last_message_is_read boolean,
    last_message_created_at timestamptz,
    unread_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
    v_offset integer := greatest(coalesce(p_offset, 0), 0);
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'not_authenticated';
    END IF;

    RETURN QUERY
    SELECT
        m.id,
        other_profile.id,
        coalesce(nullif(btrim(other_profile.full_name), ''), nullif(btrim(other_profile.username), '')),
        other_profile.avatar_url,
        coalesce(other_profile.last_active, other_profile.last_seen_at),
        last_message.id,
        last_message.content,
        last_message.type,
        last_message.sender_id,
        coalesce(last_message.is_read, true),
        last_message.created_at,
        (
            SELECT count(*)
            FROM public.messages unread
            WHERE unread.match_id = m.id
              AND unread.sender_id <> v_user_id
              AND coalesce(unread.is_read, false) = false
              AND (unread.expires_at IS NULL OR unread.expires_at > now())
              AND NOT (coalesce(unread.metadata->'deleted_for', '[]'::jsonb) @> to_jsonb(v_user_id::text))
        )
    FROM public.matches m
    JOIN public.profiles other_profile
      ON other_profile.id = CASE
          WHEN m.user1_id = v_user_id THEN m.user2_id
          ELSE m.user1_id
      END
    LEFT JOIN LATERAL (
        SELECT msg.id,
               msg.content,
               msg.type,
               msg.sender_id,
               msg.is_read,
               msg.created_at
        FROM public.messages msg
        WHERE msg.match_id = m.id
          AND (msg.expires_at IS NULL OR msg.expires_at > now())
          AND NOT (coalesce(msg.metadata->'deleted_for', '[]'::jsonb) @> to_jsonb(v_user_id::text))
        ORDER BY msg.created_at DESC, msg.id DESC
        LIMIT 1
    ) last_message ON true
    WHERE v_user_id IN (m.user1_id, m.user2_id)
    ORDER BY coalesce(last_message.created_at, m.created_at) DESC, m.id
    LIMIT v_limit
    OFFSET v_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.get_native_conversations(integer, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_native_conversations(integer, integer) TO authenticated;
