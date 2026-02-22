-- LIVE MODE REPAIR v2: CONSOLIDATED FIX
-- Fixes Discovery crashing, Notification violations, and Presence Heartbeat.

-- 1. EXPAND NOTIFICATION TYPES (Fixes Swipe Constraint Violation)
DO $$ 
BEGIN 
    ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
    ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
        CHECK (type IN (
            'match', 'message', 'view', 'payment', 'goal_reached', 
            'snapshot_reaction', 'status_update', 'system', 
            'snapshot', 'like', 'profile_view', 'super_swipe', 'premium_swipe'
        ));
END $$;

-- 2. CREATE HEARTBEAT FUNCTION (Fixes 404 update_user_presence)
CREATE OR REPLACE FUNCTION public.update_user_presence()
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET 
        last_seen_at = now(),
        is_live = true,
        completion_score = COALESCE(completion_score, 0) -- Defensive
    WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. REFRESH DISCOVERY VIEW (Fixes column "is_live" does not exist)
-- Recreating the view forces PostgreSQL to include the new columns added to profiles.
DROP VIEW IF EXISTS public.discovery_feed_v3;
CREATE VIEW public.discovery_feed_v3 AS
SELECT 
    p.*,
    COALESCE(get_user_visibility_score(p.id), 0) as visibility_score,
    COALESCE(s.plan_type, 'Free') as plan_type,
    EXISTS (SELECT 1 FROM boosts b WHERE b.user_id = p.id AND b.expires_at > now()) as is_boosted
FROM 
    public.profiles p
LEFT JOIN 
    public.subscriptions s ON s.user_id = p.id;

GRANT SELECT ON public.discovery_feed_v3 TO anon, authenticated;

-- 4. ENSURE STORAGE BUCKETS (Fixes Bucket Not Found)
-- Consolidator: profile-photos and snap_media
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('profile-photos', 'profile-photos', true),
    ('snap_media', 'snap_media', true),
    ('status-media', 'status-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Buckets RLS Policies (Insert for Authenticated, Select for Everyone)
DO $$ 
DECLARE
    b_id TEXT;
BEGIN
    FOR b_id IN SELECT unnest(ARRAY['profile-photos', 'snap_media', 'status-media']) LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow auth insert for %s" ON storage.objects', b_id);
        EXECUTE format('CREATE POLICY "Allow auth insert for %s" ON storage.objects FOR INSERT WITH CHECK (bucket_id = ''%s'' AND auth.role() = ''authenticated'')', b_id, b_id);
        
        EXECUTE format('DROP POLICY IF EXISTS "Allow public select for %s" ON storage.objects', b_id);
        EXECUTE format('CREATE POLICY "Allow public select for %s" ON storage.objects FOR SELECT USING (bucket_id = ''%s'')', b_id, b_id);
    END LOOP;
END $$;

-- 5. GRANTS (Final safety measure)
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

SELECT 'SUCCESS: LIVE MODE & SWIPES REPAIRED' as status;
