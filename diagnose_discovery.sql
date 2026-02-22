-- DIAGNOSTIC: Check discovery status
SELECT count(*) as total_profiles FROM public.profiles;

SELECT id, full_name, role, gender, completion_score, visibility_score 
FROM discovery_feed_v3 
LIMIT 5;

SELECT * FROM public.swipe_limits WHERE user_id = (SELECT id FROM public.profiles LIMIT 1);
