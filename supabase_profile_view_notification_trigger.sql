-- ============================================================
-- Profile View Notification Trigger
-- Run this in your Supabase SQL Editor.
-- ============================================================
-- Purpose: When a user views another's profile (INSERT into
-- profile_views), automatically create an in-app notification
-- for the profile owner. Rate-limited to once per viewer per
-- 1-hour window to avoid spam.
-- ============================================================

CREATE OR REPLACE FUNCTION notify_on_profile_view()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_count INT;
  v_viewer_name  TEXT;
BEGIN
  -- 1. Rate limit: skip if viewer already notified owner in last 60 minutes
  SELECT COUNT(*) INTO v_recent_count
  FROM notifications
  WHERE user_id   = NEW.profile_owner_id
    AND actor_id  = NEW.viewer_id
    AND type      = 'profile_view'
    AND created_at > NOW() - INTERVAL '60 minutes';

  IF v_recent_count > 0 THEN
    RETURN NEW; -- Already notified recently — skip
  END IF;

  -- 2. Get viewer's display name
  SELECT COALESCE(full_name, 'Someone') INTO v_viewer_name
  FROM profiles
  WHERE id = NEW.viewer_id;

  -- 3. Insert notification for profile owner
  INSERT INTO notifications (user_id, actor_id, type, title, content, metadata, is_read, created_at)
  VALUES (
    NEW.profile_owner_id,
    NEW.viewer_id,
    'profile_view',
    '👀 Someone viewed your profile',
    v_viewer_name || ' just checked out your profile!',
    jsonb_build_object(
      'viewer_id', NEW.viewer_id,
      'source',    COALESCE(NEW.source, 'discovery'),
      'url',       '/viewers'
    ),
    false,
    NOW()
  );

  RETURN NEW;
END;
$$;

-- Drop old trigger if it exists, then recreate
DROP TRIGGER IF EXISTS on_profile_view_insert ON profile_views;

CREATE TRIGGER on_profile_view_insert
  AFTER INSERT ON profile_views
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_profile_view();

-- ============================================================
-- Grant execute to authenticated role so RLS policies work
-- ============================================================
GRANT EXECUTE ON FUNCTION notify_on_profile_view() TO authenticated;
