-- ═══════════════════════════════════════════════════════════════════
-- CAMPUS PULSE SCHEMA
-- Run this in Supabase SQL Editor.
-- Creates confession_reactions and confession_claims tables.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Emoji reactions on confessions (one per emoji per user)
CREATE TABLE IF NOT EXISTS public.confession_reactions (
    id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    confession_id UUID      REFERENCES public.confessions(id) ON DELETE CASCADE NOT NULL,
    user_id     UUID        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    emoji       TEXT        NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_emoji CHECK (emoji IN ('🔥', '🙊', '👀', '🙏')),
    UNIQUE (confession_id, user_id, emoji) -- one reaction per emoji per user
);

-- 2. Anonymous "Claim It" requests (one per user per confession)
CREATE TABLE IF NOT EXISTS public.confession_claims (
    id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    confession_id UUID        REFERENCES public.confessions(id) ON DELETE CASCADE NOT NULL,
    claimer_id    UUID        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (confession_id, claimer_id) -- one claim per user
);

-- 3. Enable Row-Level Security
ALTER TABLE public.confession_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confession_claims    ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies (drop first so re-runs are safe)
DROP POLICY IF EXISTS "Anyone can view reactions"      ON public.confession_reactions;
DROP POLICY IF EXISTS "Users manage own reactions"     ON public.confession_reactions;
DROP POLICY IF EXISTS "Users insert own claims"        ON public.confession_claims;
DROP POLICY IF EXISTS "Users view claims on their confessions" ON public.confession_claims;

-- Anyone authenticated can read reactions
CREATE POLICY "Anyone can view reactions"
    ON public.confession_reactions FOR SELECT USING (true);

-- Users can only manage their own reactions
CREATE POLICY "Users manage own reactions"
    ON public.confession_reactions FOR ALL
    USING (auth.uid() = user_id);

-- Users can insert their own claims (for "Claim It" feature)
CREATE POLICY "Users insert own claims"
    ON public.confession_claims FOR INSERT
    WITH CHECK (auth.uid() = claimer_id);

-- Users can see how many claims their own confessions got
CREATE POLICY "Users view claims on their confessions"
    ON public.confession_claims FOR SELECT
    USING (
        auth.uid() = claimer_id
        OR auth.uid() IN (
            SELECT user_id FROM public.confessions
            WHERE id = confession_id
        )
    );

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reactions_confession ON public.confession_reactions(confession_id);
CREATE INDEX IF NOT EXISTS idx_claims_confession    ON public.confession_claims(confession_id);

-- Done! The Confessions page will now support emoji reactions and Claim It.
