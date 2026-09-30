-- Fix RLS policy on public.profiles so authenticated users can view active public profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Authenticated users can view public active profiles'
  ) THEN
    CREATE POLICY "Authenticated users can view public active profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
      COALESCE(is_blocked, false) = false
      AND COALESCE(is_banned, false) = false
      AND (incognito_mode IS NOT TRUE OR id = (SELECT auth.uid()))
    );
  END IF;
END $$;

-- Ensure grants on views for authenticated and anon
GRANT SELECT ON public.discovery_feed_v3 TO authenticated;
GRANT SELECT ON public.discovery_feed_v3 TO anon;

GRANT SELECT ON public.leaderboard_unified TO authenticated;
GRANT SELECT ON public.leaderboard_unified TO anon;

GRANT SELECT ON public.optimized_confessions TO authenticated;
GRANT SELECT ON public.optimized_confessions TO anon;
