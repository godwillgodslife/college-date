-- 1. DROP the existing view first
DROP VIEW IF EXISTS public.leaderboard_unified;

-- 2. CREATE or REPLACE the view with security_invoker = false (definer)
-- This runs the view with owner privileges, allowing users to query aggregated ranks 
-- across other users' swipes and wallets under Supabase RLS.
CREATE VIEW public.leaderboard_unified WITH (security_invoker = false) AS
SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    p.university,
    p.gender,
    -- Composite "Most Wanted" score representing fans/engagement:
    -- 10 * right swipes received + 2 * profile views received + 5 * matches
    (
        COALESCE(swipe_stats.likes_received, 0) * 10 + 
        COALESCE(view_stats.views_received, 0) * 2 + 
        COALESCE(match_stats.match_count, 0) * 5
    )::integer as premium_swipes_received,
    COALESCE(w.total_spent, 0)::integer as total_spent,
    p.completion_score
FROM public.profiles p
LEFT JOIN (
    SELECT swiped_id, COUNT(id) as likes_received
    FROM public.swipes
    WHERE direction = 'right'
    GROUP BY swiped_id
) swipe_stats ON p.id = swipe_stats.swiped_id
LEFT JOIN (
    SELECT profile_owner_id, COUNT(id) as views_received
    FROM public.profile_views
    GROUP BY profile_owner_id
) view_stats ON p.id = view_stats.profile_owner_id
LEFT JOIN (
    SELECT user_id, COUNT(*) as match_count
    FROM (
        SELECT user1_id as user_id FROM public.matches
        UNION ALL
        SELECT user2_id as user_id FROM public.matches
    ) all_matches
    GROUP BY user_id
) match_stats ON p.id = match_stats.user_id
LEFT JOIN public.wallets w ON p.id = w.user_id
WHERE p.is_banned = false 
  AND p.is_shadow_banned = false
  -- Recency Filter: Only show users active in the last 14 days (or never-logged-in new users to avoid complete emptiness in testing)
  AND (
      p.last_active > (NOW() - INTERVAL '14 days') 
      OR p.last_seen_at > (NOW() - INTERVAL '14 days')
      OR p.last_active IS NULL
  );

-- 3. GRANT select rights on the new view
GRANT SELECT ON public.leaderboard_unified TO anon, authenticated;

-- 4. ONE-TIME CLEANUP: Recalculate total_spent for all existing wallets
-- First, sum up all completed payment/debit transactions from wallet_transactions
WITH spent_stats AS (
    SELECT 
        wallet_id, 
        COALESCE(SUM(amount), 0) as total_from_tx
    FROM 
        public.wallet_transactions
    WHERE 
        status IN ('completed', 'success')
        AND type IN ('payment', 'debit', 'subscription')
    GROUP BY 
        wallet_id
)
UPDATE public.wallets w
SET 
    total_spent = COALESCE(ss.total_from_tx, 0),
    updated_at = NOW()
FROM 
    spent_stats ss
WHERE 
    w.id = ss.wallet_id;

-- Second, add 2900 NGN for all users with active premium subscriptions 
-- to account for direct subscription payments that did not log wallet_transactions historically.
UPDATE public.wallets w
SET 
    total_spent = total_spent + 2900,
    updated_at = NOW()
FROM 
    public.subscriptions s
WHERE 
    w.user_id = s.user_id 
    AND s.status = 'active'
    AND NOT EXISTS (
        SELECT 1 
        FROM public.wallet_transactions wt 
        WHERE wt.wallet_id = w.id 
          AND wt.type = 'subscription' 
          AND wt.status IN ('completed', 'success')
    );
