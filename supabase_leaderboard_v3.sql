-- ====================================================
-- LEADERBOARD VIEWS (Engagement Star logic)
-- ====================================================

-- Most Wanted (Based on Right Swipes received)
CREATE OR REPLACE VIEW leaderboard_most_wanted AS
SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    p.university,
    COUNT(s.id) as premium_swipes_received -- "Wanted" score
FROM 
    public.profiles p
LEFT JOIN 
    public.swipes s ON s.swiped_id = p.id AND s.direction = 'right'
GROUP BY 
    p.id
ORDER BY 
    premium_swipes_received DESC
LIMIT 50;

-- Big Spenders (Based on Total Spent in Wallets)
CREATE OR REPLACE VIEW leaderboard_big_spenders AS
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
ORDER BY 
    w.total_spent DESC
LIMIT 50;

-- Campus Stars (Combined Engagement Score)
CREATE OR REPLACE VIEW leaderboard_campus_stars AS
SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    p.university,
    e.score as engagement_score,
    e.daily_streak
FROM 
    public.profiles p
JOIN 
    public.engagement_scores e ON e.user_id = p.id
ORDER BY 
    e.score DESC
LIMIT 50;

GRANT SELECT ON leaderboard_most_wanted TO anon, authenticated;
GRANT SELECT ON leaderboard_big_spenders TO anon, authenticated;
GRANT SELECT ON leaderboard_campus_stars TO anon, authenticated;
