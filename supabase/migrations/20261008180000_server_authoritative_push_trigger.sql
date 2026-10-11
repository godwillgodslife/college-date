-- Migration: Server-Authoritative Push Delivery Trigger
-- Description: Establishes a database trigger on public.notifications that asynchronously
-- invokes the send-notification-push Edge Function via pg_net with service_role privileges
-- immediately upon row creation, eliminating dropped pushes from client disconnections.

-- Ensure pg_net extension is available
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA net;

-- Create the trigger function
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
    -- 1. Check if notification is already read or explicitly suppressed
    IF NEW.is_read = true 
       OR NEW.metadata->>'suppress_push' = 'true' 
       OR NEW.metadata->>'suppressPush' = 'true' 
       OR NEW.metadata->>'recipientIsActive' = 'true' THEN
        RETURN NEW;
    END IF;

    -- 2. Resolve Edge Function URL (custom setting -> app_config -> default project endpoint)
    v_edge_url := COALESCE(
        NULLIF(current_setting('app.settings.edge_function_base_url', true), ''),
        NULLIF(current_setting('app.supabase_url', true), ''),
        (SELECT value #>> '{}' FROM public.app_config WHERE key = 'edge_function_base_url'),
        'https://gedoyoleoscgxgdqszzc.supabase.co/functions/v1'
    );
    IF NOT v_edge_url LIKE '%/send-notification-push' THEN
        v_edge_url := rtrim(v_edge_url, '/') || '/send-notification-push';
    END IF;

    -- 3. Resolve Service Role Key for authenticated Edge Function invocation
    v_service_key := COALESCE(
        NULLIF(current_setting('app.settings.service_role_key', true), ''),
        NULLIF(current_setting('app.supabase_service_key', true), ''),
        (SELECT value #>> '{}' FROM public.app_config WHERE key = 'supabase_service_role_key'),
        ''
    );

    -- 4. Assemble standard JSONB payload matching Supabase webhook and Edge Function parser
    v_payload := jsonb_build_object(
        'type', 'INSERT',
        'table', 'notifications',
        'schema', 'public',
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
        'Authorization', 'Bearer ' || v_service_key
    );

    -- 5. Exception containment block: invoke net.http_post asynchronously
    -- Failures in network dispatch will never abort or roll back client database transactions
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

-- Attach trigger to public.notifications
DROP TRIGGER IF EXISTS trg_notifications_push_dispatch ON public.notifications;
CREATE TRIGGER trg_notifications_push_dispatch
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_notifications_push_dispatch();

COMMENT ON FUNCTION public.trg_fn_notifications_push_dispatch() IS 'Server-authoritative trigger dispatching push notifications via send-notification-push Edge Function.';
COMMENT ON TRIGGER trg_notifications_push_dispatch ON public.notifications IS 'Asynchronously dispatches push notification upon row insertion in public.notifications.';
