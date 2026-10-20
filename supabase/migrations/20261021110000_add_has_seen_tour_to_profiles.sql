-- Migration: Add has_seen_tour column to public.profiles and backfill existing accounts
-- File: supabase/migrations/20261021110000_add_has_seen_tour_to_profiles.sql

-- 1. Add has_seen_tour column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_seen_tour boolean DEFAULT false;

-- 2. Backfill existing active and established accounts
-- Accounts created more than 24 hours ago, or with completed profile elements,
-- are experienced members who must not see the introductory tour.
UPDATE public.profiles
SET has_seen_tour = true
WHERE has_seen_tour IS NOT TRUE
  AND (
    created_at < now() - interval '24 hours'
    OR completion_score >= 30
    OR (bio IS NOT NULL AND bio != '')
    OR (avatar_url IS NOT NULL AND avatar_url != '')
    OR is_verified = true
    OR is_optimised = true
  );

-- 3. Document table column
COMMENT ON COLUMN public.profiles.has_seen_tour IS 'Flag indicating whether user has seen or dismissed the introductory onboarding tour';
