-- Admin Panel Extended Features SQL
-- Run this in Supabase SQL editor AFTER existing setup scripts

-- ============================================================
-- 1. Confession Reports Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.confession_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    confession_id UUID NOT NULL REFERENCES public.confessions(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL DEFAULT 'inappropriate',
    details TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending | reviewed | dismissed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(confession_id, reporter_id)
);

ALTER TABLE public.confession_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can report confessions" ON public.confession_reports;
CREATE POLICY "Users can report confessions"
ON public.confession_reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Admins can view all reports" ON public.confession_reports;
CREATE POLICY "Admins can view all reports"
ON public.confession_reports FOR SELECT
USING (true); -- Admin RLS handled at app layer

-- ============================================================
-- 2. Promo Codes Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_percent INT NOT NULL DEFAULT 10 CHECK (discount_percent BETWEEN 1 AND 100),
    max_uses INT NOT NULL DEFAULT 100,
    uses_count INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage promo codes" ON public.promo_codes;
CREATE POLICY "Admins can manage promo codes"
ON public.promo_codes FOR ALL
USING (true);

-- ============================================================
-- 3. App Config Keys for New Features
-- ============================================================
INSERT INTO public.app_config (key, value) VALUES
    ('leaderboard_enabled',    'true'::jsonb),
    ('confessions_enabled',    'true'::jsonb),
    ('premium_swipes_enabled', 'true'::jsonb),
    ('free_daily_swipes',      '10'::jsonb),
    ('banner_message',         '""'::jsonb),
    ('banner_active',          'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 4. Admin: Get All Wallets (for payout manager)
-- ============================================================
CREATE OR REPLACE FUNCTION admin_get_wallets()
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    university TEXT,
    gender TEXT,
    total_earned NUMERIC,
    total_spent NUMERIC
)
LANGUAGE sql SECURITY DEFINER
AS $$
    SELECT 
        p.id as user_id,
        p.full_name,
        p.university,
        p.gender,
        COALESCE(w.total_earned, 0) as total_earned,
        COALESCE(w.total_spent, 0) as total_spent
    FROM profiles p
    LEFT JOIN wallets w ON p.id = w.user_id
    WHERE COALESCE(w.total_earned, 0) > 0 OR COALESCE(w.total_spent, 0) > 0
    ORDER BY total_earned DESC;
$$;

GRANT EXECUTE ON FUNCTION admin_get_wallets() TO authenticated;

-- ============================================================
-- 5. Admin: Get Transaction Ledger
-- ============================================================
CREATE OR REPLACE FUNCTION admin_get_transactions(p_limit INT DEFAULT 100, p_offset INT DEFAULT 0)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    full_name TEXT,
    university TEXT,
    gender TEXT,
    type TEXT,
    amount NUMERIC,
    status TEXT,
    description TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE sql SECURITY DEFINER
AS $$
    SELECT 
        wt.id,
        wt.user_id,
        p.full_name,
        p.university,
        p.gender,
        wt.type,
        wt.amount,
        wt.status,
        wt.description,
        wt.created_at
    FROM wallet_transactions wt
    LEFT JOIN profiles p ON wt.user_id = p.id
    ORDER BY wt.created_at DESC
    LIMIT p_limit OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION admin_get_transactions(INT, INT) TO authenticated;

-- ============================================================
-- 6. Admin: Dashboard Analytics
-- ============================================================
CREATE OR REPLACE FUNCTION admin_get_analytics()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE 
    result json;
BEGIN
    SELECT json_build_object(
        'dailySignups', (
            SELECT json_agg(row_to_json(d)) FROM (
                SELECT DATE(created_at) as date, COUNT(*) as count
                FROM profiles
                WHERE created_at > NOW() - INTERVAL '7 days'
                GROUP BY DATE(created_at)
                ORDER BY date
            ) d
        ),
        'dailyRevenue', (
            SELECT json_agg(row_to_json(r)) FROM (
                SELECT DATE(created_at) as date, SUM(amount) as total
                FROM wallet_transactions
                WHERE type = 'debit' AND status = 'completed'
                AND created_at > NOW() - INTERVAL '7 days'
                GROUP BY DATE(created_at)
                ORDER BY date
            ) r
        ),
        'universityStats', (
            SELECT json_agg(row_to_json(u)) FROM (
                SELECT university, COUNT(*) as user_count,
                    COUNT(CASE WHEN gender = 'male' THEN 1 END) as males,
                    COUNT(CASE WHEN gender = 'female' THEN 1 END) as females
                FROM profiles
                WHERE university IS NOT NULL AND university != ''
                GROUP BY university
                ORDER BY user_count DESC
                LIMIT 10
            ) u
        ),
        'topSpenders', (
            SELECT json_agg(row_to_json(s)) FROM (
                SELECT p.full_name, p.university, COALESCE(w.total_spent, 0) as total_spent
                FROM profiles p
                LEFT JOIN wallets w ON p.id = w.user_id
                WHERE COALESCE(w.total_spent, 0) > 0
                ORDER BY total_spent DESC
                LIMIT 5
            ) s
        ),
        'genderSplit', (
            SELECT json_build_object(
                'male', COUNT(CASE WHEN gender = 'male' THEN 1 END),
                'female', COUNT(CASE WHEN gender = 'female' THEN 1 END),
                'other', COUNT(CASE WHEN gender NOT IN ('male', 'female') THEN 1 END)
            )
            FROM profiles
        )
    ) INTO result;
    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_analytics() TO authenticated;

-- ============================================================
-- 7. Grant SELECT on confession_reports
-- ============================================================
GRANT SELECT, INSERT ON public.confession_reports TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_codes TO authenticated;
