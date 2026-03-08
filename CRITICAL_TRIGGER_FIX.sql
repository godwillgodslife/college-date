-- ═══════════════════════════════════════════════════════════════════
-- CRITICAL FIX: Make Notification Triggers Fault-Tolerant
-- Run this in your Supabase SQL Editor IMMEDIATELY.
-- This stops the "schema 'net' does not exist" error from blocking swipes.
-- ═══════════════════════════════════════════════════════════════════

-- STEP 1: Try to enable pg_net (you may need to enable it in the
-- Supabase dashboard under Database > Extensions > pg_net first)
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- STEP 2: Replace the swipe notification trigger to be fault-tolerant.
-- The trigger will now catch any error (including missing pg_net) and
-- allow the swipe INSERT to succeed regardless.

CREATE OR REPLACE FUNCTION public.notify_on_swipe()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Attempt to send notification, but NEVER block the swipe on failure
    BEGIN
        -- Only fire for right-swipes (likes)
        IF NEW.direction = 'right' THEN
            PERFORM net.http_post(
                url := current_setting('app.edge_function_url', true) || '/notify-on-event',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || current_setting('app.supabase_service_key', true)
                ),
                body := jsonb_build_object(
                    'type', 'new_swipe',
                    'swiper_id', NEW.swiper_id,
                    'swiped_id', NEW.swiped_id
                )::text
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Silently swallow errors — never block core functionality
        RAISE WARNING 'notify_on_swipe: notification failed (non-critical): %', SQLERRM;
    END;

    RETURN NEW;
END;
$$;

-- STEP 3: Also fix the profile_views notification trigger the same way
CREATE OR REPLACE FUNCTION public.notify_on_profile_view()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    BEGIN
        PERFORM net.http_post(
            url := current_setting('app.edge_function_url', true) || '/notify-on-event',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.supabase_service_key', true)
            ),
            body := jsonb_build_object(
                'type', 'profile_view',
                'viewer_id', NEW.viewer_id,
                'owner_id', NEW.profile_owner_id
            )::text
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'notify_on_profile_view: notification failed (non-critical): %', SQLERRM;
    END;

    RETURN NEW;
END;
$$;

-- STEP 4: Verify the profile_views table has profile_owner_id (not viewed_id)
-- If it doesn't exist, add it:
DO $$
BEGIN
    -- Check if profile_owner_id exists, if not try to rename viewed_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profile_views' AND column_name = 'profile_owner_id'
    ) THEN
        -- If the table has 'viewed_id' rename it, otherwise add it
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'profile_views' AND column_name = 'viewed_id'
        ) THEN
            ALTER TABLE public.profile_views RENAME COLUMN viewed_id TO profile_owner_id;
        ELSE
            ALTER TABLE public.profile_views
            ADD COLUMN profile_owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Done! Your swipes and profile views should now work without errors.
-- The notification attempts will fail silently until pg_net is configured.
