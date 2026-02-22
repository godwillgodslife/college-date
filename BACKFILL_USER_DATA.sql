-- FIX MISSING DATA FOR EXISTING USERS
-- Run this in Supabase SQL Editor to repair users who signed up
-- before the handle_new_user trigger was properly configured.

-- Step 1: Ensure the trigger is in place (re-apply from ULTIMATE_SIGNUP_FIX.sql)
-- (Skip if you already ran ULTIMATE_SIGNUP_FIX.sql recently)

-- Step 2: Backfill profiles for any auth.users missing a profiles row
INSERT INTO public.profiles (id, email, full_name, gender, role, university, age, free_swipes)
SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email),
    LOWER(COALESCE(u.raw_user_meta_data->>'role', 'male')),
    INITCAP(COALESCE(u.raw_user_meta_data->>'role', 'Male')),
    'Campus',
    19,
    20
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Backfill wallets for users missing wallet rows
INSERT INTO public.wallets (user_id)
SELECT p.id
FROM public.profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM public.wallets w WHERE w.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Step 4: Backfill subscriptions for users missing subscription rows
INSERT INTO public.subscriptions (user_id)
SELECT p.id
FROM public.profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM public.subscriptions s WHERE s.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Step 4: Backfill swipe_limits for users missing rows
INSERT INTO public.swipe_limits (user_id)
SELECT p.id
FROM public.profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM public.swipe_limits sl WHERE sl.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Step 5: Backfill engagement_scores for users missing rows
INSERT INTO public.engagement_scores (user_id, score, daily_streak)
SELECT p.id, 0, 0
FROM public.profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM public.engagement_scores es WHERE es.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Step 6: Fix missing Usernames (Critical for discovery & chat)
UPDATE public.profiles 
SET username = split_part(email, '@', 1) 
WHERE username IS NULL OR username = '';

-- Step 7: Reset / Initialize Free Swipes (Safety for CD 2.0)
UPDATE public.profiles
SET free_swipes = 20
WHERE free_swipes IS NULL OR free_swipes = 0;

-- Step 8: Recalculate Completion Scores & Optimization Status
-- This ensures the "Profile Strength" UI is accurate for everyone
UPDATE public.profiles p
SET 
    completion_score = public.calculate_completion_score(p.id),
    is_optimised = (public.calculate_completion_score(p.id) >= 60),
    updated_at = now();

-- Step 9: Verify Final Alignment
SELECT 
    u.id,
    u.email,
    p.username,
    p.completion_score,
    (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)) AS has_profile,
    (EXISTS (SELECT 1 FROM public.wallets w WHERE w.user_id = u.id)) AS has_wallet,
    (EXISTS (SELECT 1 FROM public.engagement_scores es WHERE es.user_id = u.id)) AS has_engagement,
    (EXISTS (SELECT 1 FROM public.swipe_limits sl WHERE sl.user_id = u.id)) AS has_swipe_limit
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at DESC
LIMIT 20;
