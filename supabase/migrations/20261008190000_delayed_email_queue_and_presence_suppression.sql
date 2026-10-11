-- Migration: 20261008190000_delayed_email_queue_and_presence_suppression.sql
-- Description: Establishes public.notification_email_queue, 15-minute grace window enqueue trigger,
-- auto-cancellation triggers upon notification read/seen, atomic conversation read RPC, and batch worker RPCs.

-- 1. Create notification_email_queue table
CREATE TABLE IF NOT EXISTS public.notification_email_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    recipient_email text,
    category text NOT NULL DEFAULT 'general',
    type text NOT NULL,
    title text NOT NULL,
    content text,
    body text,
    action_url text,
    dedupe_key text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'cancelled_read', 'skipped_preference', 'failed')),
    scheduled_for timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
    sent_at timestamptz,
    cancelled_at timestamptz,
    failed_at timestamptz,
    failure_reason text,
    error_message text,
    retry_count integer NOT NULL DEFAULT 0,
    max_retries integer NOT NULL DEFAULT 3,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Performance and Deduplication Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_queue_dedupe_pending
    ON public.notification_email_queue (dedupe_key)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_queue_pending_scheduled
    ON public.notification_email_queue (scheduled_for ASC)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_queue_notification_pending
    ON public.notification_email_queue (notification_id)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_queue_user_status
    ON public.notification_email_queue (user_id, status);

-- 3. Row Level Security and Grants
ALTER TABLE public.notification_email_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own email queue items" ON public.notification_email_queue;
CREATE POLICY "Users can view own email queue items"
    ON public.notification_email_queue FOR SELECT
    TO authenticated
    USING ((select auth.uid()) = user_id);

GRANT SELECT ON TABLE public.notification_email_queue TO authenticated;
GRANT ALL ON TABLE public.notification_email_queue TO service_role;

-- 4. Trigger Function: Enqueue Delayed Notification Email
CREATE OR REPLACE FUNCTION public.trg_fn_notifications_enqueue_delayed_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_user_id uuid;
    v_actor_id uuid;
    v_conv_id uuid;
    v_dedupe_key text;
    v_email_enabled boolean;
    v_action_url text;
BEGIN
    -- 1. Guard against already read notifications or explicit suppression
    IF NEW.is_read = true 
       OR NEW.metadata->>'suppress_email' = 'true' 
       OR NEW.metadata->>'suppressEmail' = 'true' 
       OR NEW.metadata->>'recipientIsActive' = 'true' THEN
        RETURN NEW;
    END IF;

    -- 2. Resolve target user and actor
    v_target_user_id := COALESCE(NEW.user_id, NEW.recipient_id);
    IF v_target_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_actor_id := COALESCE(NEW.actor_id, NEW.sender_id);
    IF (NEW.metadata->>'is_anonymous') = 'true' OR NEW.type = 'confession' THEN
        v_actor_id := NULL;
    END IF;

    -- 3. Check user profile email preference
    SELECT email_notifications INTO v_email_enabled
    FROM public.profiles
    WHERE id = v_target_user_id;

    IF v_email_enabled = false THEN
        RETURN NEW;
    END IF;

    -- 4. Resolve conversation ID (for chat deduplication)
    v_conv_id := COALESCE(
        NEW.conversation_id,
        NEW.match_id,
        CASE WHEN (NEW.metadata->>'match_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' 
             THEN (NEW.metadata->>'match_id')::uuid ELSE NULL END,
        CASE WHEN (NEW.metadata->>'conversation_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' 
             THEN (NEW.metadata->>'conversation_id')::uuid ELSE NULL END
    );

    -- 5. Construct dedupe_key (matching PROJECT.md Interface Contract 2)
    IF NEW.category = 'messages' OR NEW.type IN ('message', 'chat') OR v_conv_id IS NOT NULL THEN
        IF v_conv_id IS NOT NULL THEN
            v_dedupe_key := 'email:chat:' || v_target_user_id::text || ':' || v_conv_id::text;
        ELSE
            v_dedupe_key := 'email:chat:' || v_target_user_id::text || ':' || NEW.id::text;
        END IF;
    ELSIF NEW.category = 'requests' OR NEW.type IN ('request', 'connection_request', 'message_request') THEN
        v_dedupe_key := 'email:request:' || v_target_user_id::text;
    ELSIF NEW.category = 'matches' OR NEW.type IN ('match', 'like', 'super_swipe') THEN
        v_dedupe_key := 'email:match:' || v_target_user_id::text || ':' || COALESCE(v_conv_id::text, NEW.id::text);
    ELSE
        v_dedupe_key := 'email:' || v_target_user_id::text || ':' || NEW.id::text;
    END IF;

    -- 6. Resolve Action URL
    v_action_url := COALESCE(NEW.deep_link, NEW.metadata->>'url');

    -- 7. Insert with exception containment block
    BEGIN
        INSERT INTO public.notification_email_queue (
            notification_id,
            user_id,
            actor_id,
            category,
            type,
            title,
            content,
            body,
            action_url,
            dedupe_key,
            status,
            scheduled_for,
            metadata
        )
        VALUES (
            NEW.id,
            v_target_user_id,
            v_actor_id,
            COALESCE(NEW.category, 'general'),
            NEW.type,
            NEW.title,
            NEW.content,
            NEW.content,
            v_action_url,
            v_dedupe_key,
            'pending',
            now() + interval '15 minutes',
            COALESCE(NEW.metadata, '{}'::jsonb)
        )
        ON CONFLICT (dedupe_key) WHERE status = 'pending'
        DO UPDATE SET
            notification_id = EXCLUDED.notification_id,
            title = EXCLUDED.title,
            content = EXCLUDED.content,
            body = EXCLUDED.content,
            action_url = COALESCE(EXCLUDED.action_url, public.notification_email_queue.action_url),
            metadata = EXCLUDED.metadata,
            updated_at = now();
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to enqueue notification email: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.trg_fn_notifications_enqueue_delayed_email() TO authenticated, service_role, anon;

DROP TRIGGER IF EXISTS trg_notifications_enqueue_delayed_email ON public.notifications;
CREATE TRIGGER trg_notifications_enqueue_delayed_email
    AFTER INSERT ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_fn_notifications_enqueue_delayed_email();

-- 5. Trigger Function: Cancel Delayed Email on Notification Read
CREATE OR REPLACE FUNCTION public.trg_fn_notifications_cancel_delayed_email_on_read()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Fire whenever notification transitions to read or seen
    IF (NEW.is_read = true AND OLD.is_read IS DISTINCT FROM true)
       OR (NEW.read_at IS NOT NULL AND OLD.read_at IS NULL) THEN
        
        BEGIN
            UPDATE public.notification_email_queue
            SET status = 'cancelled_read',
                cancelled_at = now(),
                updated_at = now()
            WHERE status = 'pending'
              AND (
                  notification_id = NEW.id
                  OR (
                      user_id = COALESCE(NEW.user_id, NEW.recipient_id)
                      AND (
                          (NEW.category = 'requests' AND dedupe_key = 'email:request:' || COALESCE(NEW.user_id, NEW.recipient_id)::text)
                          OR (
                              COALESCE(NEW.conversation_id, NEW.match_id) IS NOT NULL
                              AND dedupe_key = 'email:chat:' || COALESCE(NEW.user_id, NEW.recipient_id)::text || ':' || COALESCE(NEW.conversation_id, NEW.match_id)::text
                          )
                      )
                  )
              );
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to cancel delayed email on read: %', SQLERRM;
        END;

    END IF;

    RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.trg_fn_notifications_cancel_delayed_email_on_read() TO authenticated, service_role, anon;

DROP TRIGGER IF EXISTS trg_notifications_cancel_delayed_email_on_read ON public.notifications;
CREATE TRIGGER trg_notifications_cancel_delayed_email_on_read
    AFTER UPDATE OF is_read, read_at ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_fn_notifications_cancel_delayed_email_on_read();

-- 6. RPC: Atomic Conversation Read & Email Cancellation
CREATE OR REPLACE FUNCTION public.mark_conversation_read_and_cancel_emails(
    p_match_id uuid,
    p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_msgs_updated integer := 0;
    v_notifs_updated integer := 0;
    v_emails_cancelled integer := 0;
BEGIN
    -- 1. Resolve user ID
    v_user_id := COALESCE(p_user_id, auth.uid());
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF auth.role() <> 'service_role' AND auth.uid() <> v_user_id THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    -- 2. Validate participant membership
    IF NOT EXISTS (
        SELECT 1 FROM public.matches
        WHERE id = p_match_id
          AND (user1_id = v_user_id OR user2_id = v_user_id)
    ) THEN
        RAISE EXCEPTION 'User is not a participant in this conversation';
    END IF;

    -- 3. Mark messages as read in public.messages
    UPDATE public.messages
    SET is_read = true,
        read_at = COALESCE(read_at, now()),
        seen_at = COALESCE(seen_at, now())
    WHERE match_id = p_match_id
      AND sender_id <> v_user_id
      AND COALESCE(is_read, false) = false;
    GET DIAGNOSTICS v_msgs_updated = ROW_COUNT;

    -- 4. Mark notifications as read in public.notifications
    UPDATE public.notifications
    SET is_read = true,
        read_at = COALESCE(read_at, now()),
        seen_at = COALESCE(seen_at, now()),
        updated_at = now()
    WHERE user_id = v_user_id
      AND (
          match_id = p_match_id
          OR conversation_id = p_match_id
          OR (metadata->>'match_id') = p_match_id::text
          OR (metadata->>'conversation_id') = p_match_id::text
      )
      AND COALESCE(is_read, false) = false;
    GET DIAGNOSTICS v_notifs_updated = ROW_COUNT;

    -- 5. Cancel pending email queue entries
    UPDATE public.notification_email_queue
    SET status = 'cancelled_read',
        cancelled_at = now(),
        updated_at = now()
    WHERE user_id = v_user_id
      AND status = 'pending'
      AND (
          dedupe_key = 'email:chat:' || v_user_id::text || ':' || p_match_id::text
          OR notification_id IN (
              SELECT id FROM public.notifications
              WHERE user_id = v_user_id
                AND (match_id = p_match_id OR conversation_id = p_match_id)
          )
      );
    GET DIAGNOSTICS v_emails_cancelled = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'match_id', p_match_id,
        'user_id', v_user_id,
        'messages_marked_read', v_msgs_updated,
        'notifications_marked_read', v_notifs_updated,
        'emails_cancelled', v_emails_cancelled
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_conversation_read_and_cancel_emails(uuid, uuid) TO authenticated, service_role;

-- 7. RPC: Atomically Claim Batch for Queue Worker (FOR UPDATE SKIP LOCKED)
CREATE OR REPLACE FUNCTION public.claim_notification_email_batch(
    p_limit integer DEFAULT 25
)
RETURNS TABLE (
    id uuid,
    notification_id uuid,
    user_id uuid,
    actor_id uuid,
    recipient_email text,
    category text,
    type text,
    title text,
    content text,
    body text,
    action_url text,
    dedupe_key text,
    status text,
    scheduled_for timestamptz,
    retry_count integer,
    max_retries integer,
    metadata jsonb,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH due_items AS (
        SELECT q.id AS due_id
        FROM public.notification_email_queue q
        WHERE q.status = 'pending'
          AND q.scheduled_for <= now()
        ORDER BY q.scheduled_for ASC
        LIMIT LEAST(GREATEST(p_limit, 1), 50)
        FOR UPDATE SKIP LOCKED
    ),
    claimed_items AS (
        UPDATE public.notification_email_queue target
        SET status = 'processing',
            updated_at = now()
        FROM due_items
        WHERE target.id = due_items.due_id
        RETURNING target.*
    )
    SELECT
        c.id,
        c.notification_id,
        c.user_id,
        c.actor_id,
        c.recipient_email,
        c.category,
        c.type,
        c.title,
        c.content,
        c.body,
        c.action_url,
        c.dedupe_key,
        c.status,
        c.scheduled_for,
        c.retry_count,
        c.max_retries,
        c.metadata,
        c.created_at,
        c.updated_at
    FROM claimed_items c;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_notification_email_batch(integer) TO service_role;

-- 8. RPC: Worker Batch Fetch for send-notification-email (Fallback/Inspection)
CREATE OR REPLACE FUNCTION public.fetch_pending_notification_emails(
    p_batch_size integer DEFAULT 20
)
RETURNS TABLE (
    queue_id uuid,
    notification_id uuid,
    user_id uuid,
    actor_id uuid,
    category text,
    type text,
    title text,
    content text,
    action_url text,
    dedupe_key text,
    retry_count integer,
    metadata jsonb,
    is_notification_read boolean,
    recipient_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        q.id AS queue_id,
        q.notification_id,
        q.user_id,
        q.actor_id,
        q.category,
        q.type,
        q.title,
        q.content,
        q.action_url,
        q.dedupe_key,
        q.retry_count,
        q.metadata,
        COALESCE(n.is_read, false) AS is_notification_read,
        COALESCE(q.recipient_email, u.email::text) AS recipient_email
    FROM public.notification_email_queue q
    LEFT JOIN public.notifications n ON q.notification_id = n.id
    LEFT JOIN auth.users u ON q.user_id = u.id
    WHERE q.status = 'pending'
      AND q.scheduled_for <= now()
    ORDER BY q.scheduled_for ASC
    LIMIT LEAST(GREATEST(p_batch_size, 1), 100);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fetch_pending_notification_emails(integer) TO service_role;

COMMENT ON TABLE public.notification_email_queue IS 'Queue of delayed transactional emails with 15-minute unread grace window.';
COMMENT ON FUNCTION public.mark_conversation_read_and_cancel_emails IS 'Atomically marks messages & notifications as read, and cancels pending delayed emails for a conversation.';
COMMENT ON FUNCTION public.claim_notification_email_batch IS 'Claims a batch of due pending emails atomically for worker processing via FOR UPDATE SKIP LOCKED.';
