-- ═══════════════════════════════════════════════════════════
-- NOTIFICATION WEBHOOKS SETUP
-- Run this in your Supabase SQL Editor to register all 
-- database webhooks that trigger the Edge Function.
-- ═══════════════════════════════════════════════════════════

-- NOTE: Replace 'YOUR_PROJECT_REF' with your actual Supabase project ref.
-- The Edge Function URL format: https://<project-ref>.supabase.co/functions/v1/notify-on-event

-- ── 1. Shadow Hook & Money Alert: swipes table ────────────────────────────────
-- This fires on both INSERT (new like) and UPDATE (payment confirmed)

-- Enable the HTTP extension if needed:
-- CREATE EXTENSION IF NOT EXISTS http;

-- Supabase Webhooks are managed in Dashboard → Database → Webhooks
-- Below are the SQL equivalents using pg_net (Supabase's built-in HTTP extension)

-- ── Create a trigger function that calls the Edge Function ─────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_swipe()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    payload jsonb;
BEGIN
    payload := jsonb_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA,
        'record', row_to_json(NEW)::jsonb
    );

    PERFORM net.http_post(
        url := 'https://gedoyoleoscgxgdqszzc.supabase.co/functions/v1/notify-on-event',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.supabase_service_key', true)
        ),
        body := payload::text
    );

    RETURN NEW;
END;
$$;

-- ── 2. Attach trigger to swipes ───────────────────────────────────────────────
DROP TRIGGER IF EXISTS swipe_notification_trigger ON public.swipes;
CREATE TRIGGER swipe_notification_trigger
AFTER INSERT OR UPDATE ON public.swipes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_swipe();

-- ── 3. Confessions Campus Pulse trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_confession()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    payload jsonb;
BEGIN
    -- If it's an INSERT, just return. New confessions aren't viral yet.
    IF (TG_OP = 'INSERT') THEN
        RETURN NEW;
    END IF;

    -- Only fire if the confession has 20+ likes (or total reactions if columns existed) 
    -- and wasn't already notified. Using 'likes' as a proxy since reaction_count 
    -- is not a physical column.
    IF (COALESCE(NEW.likes, 0) >= 20) 
        AND (OLD.pulse_notified IS NULL OR OLD.pulse_notified = false) THEN

        payload := jsonb_build_object(
            'type', TG_OP,
            'table', TG_TABLE_NAME,
            'schema', TG_TABLE_SCHEMA,
            'record', row_to_json(NEW)::jsonb
        );

        PERFORM net.http_post(
            url := 'https://gedoyoleoscgxgdqszzc.supabase.co/functions/v1/notify-on-event',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.supabase_service_key', true)
            ),
            body := payload::text
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS confession_notification_trigger ON public.confessions;
CREATE TRIGGER confession_notification_trigger
AFTER INSERT OR UPDATE ON public.confessions
FOR EACH ROW EXECUTE FUNCTION public.notify_on_confession();

-- ── 4. Add pulse_notified column to confessions (if not exists) ───────────────
ALTER TABLE public.confessions 
ADD COLUMN IF NOT EXISTS pulse_notified BOOLEAN DEFAULT FALSE;

-- ── 5. Profile Views table & trigger (if not exists) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.profile_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    viewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    viewed_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (viewer_id, viewed_id) -- avoid duplicate view spam
);

-- Enable RLS
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.notify_on_profile_view()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    payload jsonb;
BEGIN
    payload := jsonb_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA,
        'record', row_to_json(NEW)::jsonb
    );

    PERFORM net.http_post(
        url := 'https://gedoyoleoscgxgdqszzc.supabase.co/functions/v1/notify-on-event',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.supabase_service_key', true)
        ),
        body := payload::text
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profile_view_notification_trigger ON public.profile_views;
CREATE TRIGGER profile_view_notification_trigger
AFTER INSERT ON public.profile_views
FOR EACH ROW EXECUTE FUNCTION public.notify_on_profile_view();

-- ═══════════════════════════════════════════════════════════
-- GHOST RE-ENGAGEMENT CRON (runs every Sunday at 19:00 WAT)
-- Uses pg_cron extension. Enable in Supabase: Extensions → pg_cron
-- ═══════════════════════════════════════════════════════════

-- Step 1: Create a named function for the cron job (avoids nested $$ conflict)
CREATE OR REPLACE FUNCTION public.ghost_notification_job()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    idle_user RECORD;
BEGIN
    FOR idle_user IN (
        SELECT id FROM public.profiles
        WHERE last_seen_at < NOW() - INTERVAL '48 hours'
          AND onesignal_id IS NOT NULL
    ) LOOP
        PERFORM net.http_post(
            url := 'https://gedoyoleoscgxgdqszzc.supabase.co/functions/v1/notify-on-event',
            headers := jsonb_build_object('Content-Type', 'application/json'),
            body := jsonb_build_object(
                'type', 'GHOST_PULSE',
                'user_id', idle_user.id,
                'new_users_count', 15
            )::text
        );
    END LOOP;
END;
$$;

-- Step 2: Schedule the cron job (ONLY runs if pg_cron is enabled)
-- To enable pg_cron: Supabase Dashboard → Database → Extensions → search "pg_cron" → Enable
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
            'ghost-notification-job',
            '0 18 * * 0',  -- Every Sunday at 18:00 UTC (19:00 WAT)
            'SELECT public.ghost_notification_job()'
        );
        RAISE NOTICE 'Ghost notification cron job scheduled successfully.';
    ELSE
        RAISE NOTICE 'pg_cron extension not enabled — skipping cron job setup. Enable it in Supabase Dashboard → Database → Extensions → pg_cron, then re-run this script.';
    END IF;
END;
$$;
