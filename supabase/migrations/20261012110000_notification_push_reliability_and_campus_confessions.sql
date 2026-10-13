-- Migration: Notification Push Reliability, Campus Confessions Broadcast & Retention Triggers
-- Description: 
--   1. Ensures app_config contains valid supabase_anon_key for authenticated pg_net invocation.
--   2. Updates trg_fn_notifications_push_dispatch with robust key resolution and apikey headers.
--   3. Establishes campus-wide confession broadcast trigger to notify university peers outside the app.
--   4. Creates automated profile completion and campus match visibility re-engagement function.

-- 1. Ensure supabase_anon_key is stored in public.app_config
INSERT INTO public.app_config (key, value, description)
VALUES (
    'supabase_anon_key',
    '"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZG95b2xlb3NjZ3hnZHFzenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjQ4ODcsImV4cCI6MjA4NjQwMDg4N30.pVnlTBOwxYSFgC0fQ2Wo1oEsrBWak6X2FBBeNGariys"'::jsonb,
    'Supabase anonymous JWT for Edge Function and pg_net authentication'
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 2. Harden the server-authoritative push trigger function
CREATE OR REPLACE FUNCTION public.trg_fn_notifications_push_dispatch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_edge_url text;
    v_service_key text;
    v_payload jsonb;
    v_headers jsonb;
BEGIN
    -- 1. Check if notification is already read
    IF NEW.is_read = true THEN
        RETURN NEW;
    END IF;

    -- For direct chat messages and calls, NEVER drop unread notifications even if client presence was noisy
    IF NEW.type NOT IN ('message', 'new_message', 'call') THEN
        IF NEW.metadata->>'suppress_push' = 'true' 
           OR NEW.metadata->>'suppressPush' = 'true' 
           OR NEW.metadata->>'recipientIsActive' = 'true' THEN
            RETURN NEW;
        END IF;
    END IF;

    -- 2. Resolve Edge Function URL
    v_edge_url := COALESCE(
        NULLIF(current_setting('app.settings.edge_function_base_url', true), ''),
        NULLIF(current_setting('app.supabase_url', true), ''),
        (SELECT value #>> '{}' FROM public.app_config WHERE key = 'edge_function_base_url'),
        'https://gedoyoleoscgxgdqszzc.supabase.co/functions/v1'
    );
    IF NOT v_edge_url LIKE '%/send-notification-push' THEN
        v_edge_url := rtrim(v_edge_url, '/') || '/send-notification-push';
    END IF;

    -- 3. Resolve Service Role Key or Anon Key for authenticated Edge Function invocation
    v_service_key := COALESCE(
        NULLIF(current_setting('app.settings.service_role_key', true), ''),
        NULLIF(current_setting('app.supabase_service_key', true), ''),
        (SELECT value #>> '{}' FROM public.app_config WHERE key = 'supabase_service_role_key'),
        (SELECT value #>> '{}' FROM public.app_config WHERE key = 'supabase_anon_key'),
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZG95b2xlb3NjZ3hnZHFzenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjQ4ODcsImV4cCI6MjA4NjQwMDg4N30.pVnlTBOwxYSFgC0fQ2Wo1oEsrBWak6X2FBBeNGariys'
    );

    -- 4. Assemble dual-format payload compatible with both legacy and modern OneSignal edge functions
    v_payload := jsonb_build_object(
        'type', 'INSERT',
        'table', 'notifications',
        'schema', 'public',
        'userId', COALESCE(NEW.user_id, NEW.recipient_id),
        'externalUserIds', jsonb_build_array(COALESCE(NEW.user_id, NEW.recipient_id)),
        'title', NEW.title,
        'content', NEW.content,
        'headings', jsonb_build_object('en', NEW.title),
        'contents', jsonb_build_object('en', NEW.content),
        'category', NEW.category,
        'priority', NEW.priority,
        'data', jsonb_build_object(
            'notification_id', NEW.id,
            'type', NEW.type,
            'category', NEW.category,
            'entity_id', NEW.entity_id,
            'match_id', NEW.match_id,
            'conversation_id', NEW.conversation_id,
            'deep_link', NEW.deep_link
        ),
        'record', jsonb_build_object(
            'id', NEW.id,
            'user_id', COALESCE(NEW.user_id, NEW.recipient_id),
            'recipient_id', COALESCE(NEW.recipient_id, NEW.user_id),
            'actor_id', COALESCE(NEW.actor_id, NEW.sender_id),
            'sender_id', COALESCE(NEW.sender_id, NEW.actor_id),
            'type', NEW.type,
            'category', NEW.category,
            'title', NEW.title,
            'content', NEW.content,
            'metadata', COALESCE(NEW.metadata, '{}'::jsonb),
            'deep_link', NEW.deep_link,
            'priority', NEW.priority,
            'group_key', NEW.group_key,
            'dedupe_key', NEW.dedupe_key,
            'created_at', NEW.created_at
        )
    );

    v_headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key,
        'apikey', v_service_key
    );

    -- 5. Exception containment block: invoke net.http_post asynchronously
    BEGIN
        IF EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'net' AND p.proname = 'http_post'
        ) THEN
            PERFORM net.http_post(
                url := v_edge_url,
                body := v_payload,
                headers := v_headers,
                timeout_milliseconds := 5000
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Push trigger dispatch failed: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$;

-- Grant execution rights
GRANT EXECUTE ON FUNCTION public.trg_fn_notifications_push_dispatch() TO authenticated, service_role, anon;

-- Reattach trigger
DROP TRIGGER IF EXISTS trg_notifications_push_dispatch ON public.notifications;
CREATE TRIGGER trg_notifications_push_dispatch
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_notifications_push_dispatch();

-- 3. Campus Confessions Broadcast Trigger: Notify peers on the same campus outside the app
CREATE OR REPLACE FUNCTION public.trg_fn_broadcast_campus_confession()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_campus text;
    v_snippet text;
    v_author_id uuid;
BEGIN
    v_campus := COALESCE(NEW.university, '');
    v_author_id := NEW.user_id;

    IF v_campus IS NULL OR v_campus = '' THEN
        RETURN NEW;
    END IF;

    v_snippet := CASE 
        WHEN length(NEW.content) > 55 THEN substring(NEW.content from 1 for 52) || '...'
        ELSE NEW.content
    END;

    -- Broadcast to active students on the same campus (up to 50 students per confession)
    INSERT INTO public.notifications (
        user_id,
        actor_id,
        type,
        category,
        title,
        content,
        deep_link,
        priority,
        metadata
    )
    SELECT 
        p.id,
        NULL,
        'confession',
        'social',
        '🔥 New Campus Secret (' || v_campus || ') 🤫',
        v_snippet,
        '/confessions',
        'normal',
        jsonb_build_object(
            'is_anonymous', true,
            'campus', v_campus,
            'confession_id', NEW.id,
            'url', '/confessions'
        )
    FROM public.profiles p
    WHERE p.university = v_campus
      AND p.id != v_author_id
      AND p.confession_notifications IS NOT FALSE
      AND p.push_notifications IS NOT FALSE
      AND (p.last_seen_at IS NULL OR p.last_seen_at >= now() - interval '14 days')
    ORDER BY p.last_seen_at DESC NULLS LAST
    LIMIT 50;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Campus confession broadcast failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.trg_fn_broadcast_campus_confession() TO authenticated, service_role, anon;

DROP TRIGGER IF EXISTS trg_confessions_broadcast_campus ON public.confessions;
CREATE TRIGGER trg_confessions_broadcast_campus
AFTER INSERT ON public.confessions
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_broadcast_campus_confession();

-- 4. Automated Profile Visibility & Match Retention Reminders
CREATE OR REPLACE FUNCTION public.dispatch_campus_retention_reminders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_dispatched int := 0;
BEGIN
    -- 1. Profile completion reminder: students with missing bio or avatar
    INSERT INTO public.notifications (
        user_id,
        type,
        category,
        title,
        content,
        deep_link,
        priority,
        metadata
    )
    SELECT 
        p.id,
        'profile_reminder',
        'profile_activity',
        '👀 Boost Your Campus Match Visibility!',
        'Profiles with completed photos and bios receive 4x more mutual matches. Tap to finish your profile!',
        '/profile',
        'normal',
        jsonb_build_object('url', '/profile', 'prompt', 'profile_completion')
    FROM public.profiles p
    WHERE (p.bio IS NULL OR length(p.bio) < 10 OR p.avatar_url IS NULL)
      AND p.push_notifications IS NOT FALSE
      AND NOT EXISTS (
          SELECT 1 FROM public.notifications n
          WHERE n.user_id = p.id
            AND n.type = 'profile_reminder'
            AND n.created_at >= now() - interval '3 days'
      )
    LIMIT 25;

    GET DIAGNOSTICS v_dispatched = ROW_COUNT;

    RETURN jsonb_build_object('success', true, 'dispatched', v_dispatched);
END;
$$;

GRANT EXECUTE ON FUNCTION public.dispatch_campus_retention_reminders() TO authenticated, service_role, anon;
