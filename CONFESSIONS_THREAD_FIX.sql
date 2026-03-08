-- ── CONFESSIONS THREADS & COMMENTS ───────────────────────────
CREATE TABLE IF NOT EXISTS public.confession_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    confession_id UUID NOT NULL REFERENCES public.confessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.confession_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view confession comments
DROP POLICY IF EXISTS "Anyone can view confession comments" ON public.confession_comments;
CREATE POLICY "Anyone can view confession comments"
ON public.confession_comments FOR SELECT
USING (true);

-- Policy: Authenticated users can post comments
DROP POLICY IF EXISTS "Authenticated users can post confession comments" ON public.confession_comments;
CREATE POLICY "Authenticated users can post confession comments"
ON public.confession_comments FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- ── ENHANCED CONFESSION REACTIONS ─────────────────────────────
-- Ensure the emoji column exists in confession_reactions (existing check)
-- Add comment count logic (optional but good for performance)
-- For now we use on-the-fly counting in the service.
