-- ============================================================================
-- ADMIN CONTROL TOWER SCHEMA & RPCs
-- ============================================================================

-- 1. App Configuration Table (Global Settings)
CREATE TABLE IF NOT EXISTS public.app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Default Configs
INSERT INTO public.app_config (key, value, description)
VALUES 
    ('maintenance_mode', 'false'::jsonb, 'Toggle to put the app in maintenance mode'),
    ('premium_swipe_price', '500'::jsonb, 'Cost of a premium swipe in NGN')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS on app_config
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read the config
DROP POLICY IF EXISTS "Anyone can read app_config" ON public.app_config;
CREATE POLICY "Anyone can read app_config" ON public.app_config
    FOR SELECT USING (true);

-- Only admins can update the config (using the is_admin flag in raw_user_meta_data)
DROP POLICY IF EXISTS "Admins can update app_config" ON public.app_config;
CREATE POLICY "Admins can update app_config" ON public.app_config
    FOR ALL USING (
        (auth.jwt()->'user_metadata'->>'is_admin')::boolean = true
    );

-- 2. Add Moderator/Admin Flags to Profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_shadow_banned BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Create an RPC to easily set a user as an admin (Run this manually for yourself)
CREATE OR REPLACE FUNCTION public.make_admin(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE auth.users 
    SET raw_user_meta_data = raw_user_meta_data || '{"is_admin": true}'::jsonb
    WHERE id = target_user_id;
END;
$$;

-- 3. Admin User Management RPCs
CREATE OR REPLACE FUNCTION admin_toggle_ban(p_user_id UUID, p_ban_status BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (auth.jwt()->'user_metadata'->>'is_admin')::boolean != true THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    UPDATE public.profiles SET is_banned = p_ban_status WHERE id = p_user_id;
    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION admin_toggle_shadow_ban(p_user_id UUID, p_shadow_status BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (auth.jwt()->'user_metadata'->>'is_admin')::boolean != true THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    UPDATE public.profiles SET is_shadow_banned = p_shadow_status WHERE id = p_user_id;
    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION admin_toggle_verify(p_user_id UUID, p_verify_status BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (auth.jwt()->'user_metadata'->>'is_admin')::boolean != true THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    UPDATE public.profiles SET is_verified = p_verify_status WHERE id = p_user_id;
    RETURN true;
END;
$$;


-- 4. Dashboard Metrics RPC
-- Returns aggregated stats for the Executive Overview
CREATE OR REPLACE FUNCTION admin_get_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_revenue NUMERIC;
    v_today_revenue NUMERIC;
    v_female_payouts NUMERIC;
    v_dau INTEGER;
    v_new_signups INTEGER;
    v_university_stats JSONB;
BEGIN
    -- Check Authorization
    IF (auth.jwt()->'user_metadata'->>'is_admin')::boolean != true THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    -- Total Revenue (From wallets where money was added/spent, assuming total_spent tracks system revenue)
    SELECT COALESCE(SUM(total_spent), 0) INTO v_total_revenue FROM public.wallets;
    
    -- Today's Revenue (simplified approximation based on recent wallet updates)
    SELECT COALESCE(SUM(total_spent), 0) INTO v_today_revenue 
    FROM public.wallets 
    WHERE updated_at >= CURRENT_DATE;

    -- Pending Payouts (Money earned by users, primarily females)
    SELECT COALESCE(SUM(available_balance + pending_balance), 0) INTO v_female_payouts 
    FROM public.wallets w
    JOIN public.profiles p ON w.user_id = p.id
    WHERE p.gender = 'female';

    -- Daily Active Users (DAU)
    SELECT COUNT(*) INTO v_dau 
    FROM public.engagement_scores 
    WHERE last_login >= NOW() - INTERVAL '24 hours';

    -- New Signups (Last 24h)
    SELECT COUNT(*) INTO v_new_signups 
    FROM public.profiles 
    WHERE created_at >= NOW() - INTERVAL '24 hours';

    -- University Distribution
    SELECT jsonb_agg(jsonb_build_object('university', university, 'count', count))
    INTO v_university_stats
    FROM (
        SELECT university, COUNT(*) as count 
        FROM public.profiles 
        GROUP BY university 
        ORDER BY count DESC 
        LIMIT 10
    ) sub;

    RETURN jsonb_build_object(
        'totalRevenue', v_total_revenue,
        'todayRevenue', v_today_revenue,
        'pendingPayouts', v_female_payouts,
        'dau', v_dau,
        'newSignups', v_new_signups,
        'universityStats', COALESCE(v_university_stats, '[]'::jsonb)
    );
END;
$$;


-- 5. Shadow Ban Feed Filter
-- (This was removed to prevent column mismatch errors. Shadow bans should be filtered in the frontend or specialized RPCs.)

-- Enhance RLS to allow Admins to read all profiles, wallets, etc.
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        (auth.jwt()->'user_metadata'->>'is_admin')::boolean = true
    );

DROP POLICY IF EXISTS "Admins can view all wallets" ON public.wallets;
CREATE POLICY "Admins can view all wallets" ON public.wallets
    FOR SELECT USING (
        (auth.jwt()->'user_metadata'->>'is_admin')::boolean = true
    );
    
DROP POLICY IF EXISTS "Admins can view all confessions" ON public.confessions;
CREATE POLICY "Admins can view all confessions" ON public.confessions
    FOR ALL USING (
        (auth.jwt()->'user_metadata'->>'is_admin')::boolean = true
    );

-- Content Moderation RPCs
CREATE OR REPLACE FUNCTION admin_moderate_confession(p_confession_id UUID, p_action TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (auth.jwt()->'user_metadata'->>'is_admin')::boolean != true THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    IF p_action = 'delete' THEN
        DELETE FROM public.confessions WHERE id = p_confession_id;
    ELSIF p_action = 'pin' THEN
        UPDATE public.confessions SET is_pinned = true WHERE id = p_confession_id;
    ELSIF p_action = 'unpin' THEN
        UPDATE public.confessions SET is_pinned = false WHERE id = p_confession_id;
    END IF;
    
    RETURN true;
END;
$$;
