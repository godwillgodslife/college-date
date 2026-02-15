-- LEADERBOARD SYSTEM (GAMIFICATION PHASE 3) - FIXED
-- Removed 'department' and 'level' if they don't exist in profiles yet.
-- If they are needed, we should add them to the table first. For now, we'll select what we know exists.

-- 1. View: Most Wanted (Top Girls by Premium Swipes Received in last 7 days)
DROP VIEW IF EXISTS public.leaderboard_most_wanted;

CREATE VIEW public.leaderboard_most_wanted AS
SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    p.university,
    COUNT(s.id) as premium_swipes_received
FROM 
    public.profiles p
JOIN 
    public.swipes s ON s.swiped_id = p.id
WHERE 
    p.gender = 'Female'
    AND s.type = 'premium'
    AND s.created_at > (NOW() - INTERVAL '7 days')
GROUP BY 
    p.id, p.full_name, p.avatar_url, p.university
ORDER BY 
    premium_swipes_received DESC, p.full_name ASC
LIMIT 10;


-- 2. View: Big Spenders (Top Guys by Total Spent)
DROP VIEW IF EXISTS public.leaderboard_big_spenders;

CREATE VIEW public.leaderboard_big_spenders AS
SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    p.university,
    w.total_spent
FROM 
    public.profiles p
JOIN 
    public.wallets w ON w.user_id = p.id
WHERE 
    p.gender = 'Male'
ORDER BY 
    w.total_spent DESC, p.full_name ASC
LIMIT 10;

-- 3. Grant Access
GRANT SELECT ON public.leaderboard_most_wanted TO authenticated;
GRANT SELECT ON public.leaderboard_big_spenders TO authenticated;
