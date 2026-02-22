-- DIAGNOSTIC: CHECK MY USER DATA (Single Statement)
-- Run this in the Supabase SQL Editor using the "RUN" button (Play icon).

SELECT 
    v.user_id,
    v.email,
    (SELECT count(*) FROM public.profiles WHERE id = v.user_id) > 0 as profile_exists,
    (SELECT count(*) FROM public.wallets WHERE user_id = v.user_id) > 0 as wallet_exists,
    (SELECT count(*) FROM public.swipe_limits WHERE user_id = v.user_id) > 0 as swipe_limit_exists,
    (SELECT count(*) FROM public.engagement_scores WHERE user_id = v.user_id) > 0 as engagement_exists,
    (SELECT count(*) FROM public.subscriptions WHERE user_id = v.user_id) > 0 as subscription_exists,
    (SELECT count(*) FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id WHERE p.id IS NULL) as total_broken_profiles
FROM (
    SELECT id as user_id, email FROM auth.users 
    WHERE id = auth.uid()
) v;
