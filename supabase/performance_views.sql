-- PHASE 3: DATABASE PERFORMANCE VIEWS
-- Goal: Move heavy aggregation and logic from JS to Postgres and reduce network payload.

-- 1. Optimized Confessions View
-- Aggregates reactions and comments into a single row to reduce join overhead.
CREATE OR REPLACE VIEW public.optimized_confessions AS
SELECT 
    c.id,
    c.content,
    c.university,
    c.user_id,
    c.created_at,
    COALESCE(r.reaction_data, '[]'::jsonb) as reaction_data,
    COALESCE(r.total_reactions, 0) as total_reactions,
    COALESCE(comm.comment_count, 0) as comment_count,
    COALESCE(cl.claimer_ids, '[]'::jsonb) as claimer_ids,
    (COALESCE(r.total_reactions, 0) >= 20) as is_viral
FROM confessions c
LEFT JOIN (
    SELECT 
        confession_id,
        jsonb_agg(jsonb_build_object('u', user_id, 'e', emoji)) as reaction_data,
        COUNT(*) as total_reactions
    FROM confession_reactions
    GROUP BY confession_id
) r ON c.id = r.confession_id
LEFT JOIN (
    SELECT confession_id, COUNT(*) as comment_count
    FROM confession_comments
    GROUP BY confession_id
) comm ON c.id = comm.confession_id
LEFT JOIN (
    SELECT confession_id, jsonb_agg(claimer_id) as claimer_ids
    FROM confession_claims
    GROUP BY confession_id
) cl ON c.id = cl.confession_id;

-- 2. Enhanced Leaderboard View (Single-fetch optimized)
-- This allows us to fetch both "Most Wanted" and "Big Spenders" in one query if needed,
-- or just provides a more efficient source than the current multiple joins.
DROP VIEW IF EXISTS public.leaderboard_unified;
CREATE OR REPLACE VIEW public.leaderboard_unified AS
SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    p.university,
    p.gender,
    COALESCE(swipe_stats.premium_swipes_received, 0) as premium_swipes_received,
    COALESCE(w.total_spent, 0) as total_spent,
    p.completion_score
FROM profiles p
LEFT JOIN (
    SELECT swiped_id, COUNT(id) as premium_swipes_received
    FROM public.swipes
    WHERE type = 'premium' OR type = 'super_swipe'
    GROUP BY swiped_id
) swipe_stats ON p.id = swipe_stats.swiped_id
LEFT JOIN public.wallets w ON p.id = w.user_id
WHERE p.is_banned = false AND p.is_shadow_banned = false;

-- Grant access to these views
GRANT SELECT ON public.optimized_confessions TO anon, authenticated;
GRANT SELECT ON public.leaderboard_unified TO anon, authenticated;
