-- ==============================================================================
-- Migration: 20260915120000_confession_views_and_reactions.sql
-- Description: Adds view_count column to confessions, updates optimized_confessions view,
--              expands confession_reactions emoji constraint, and adds increment_confession_view RPC.
-- ==============================================================================

-- 1. ADD view_count COLUMN TO CONFESSIONS
ALTER TABLE public.confessions ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;

-- 2. EXPAND VALID EMOJIS CONSTRAINT ON confession_reactions
ALTER TABLE public.confession_reactions DROP CONSTRAINT IF EXISTS valid_emoji;
ALTER TABLE public.confession_reactions
    ADD CONSTRAINT valid_emoji CHECK (
        emoji IN (
            '❤️', '🔥', '😂', '🙊', '🙏', '😢', '😡', '🙈', '👀',
            U&'\2764',          -- heavy black heart
            U&'\D83D\DD25',      -- fire
            U&'\D83D\DE02',      -- laughing
            U&'\D83D\DE4A',      -- see-no-evil monkey
            U&'\D83D\DE4F',      -- pray/folded hands
            U&'\D83D\DE22',      -- crying
            U&'\D83D\DE21',      -- pouting/angry
            U&'\D83D\DE48',      -- see-no-evil monkey alternate
            U&'\D83D\DC40'       -- eyes
        )
    );

-- 3. RECREATE OPTIMIZED_CONFESSIONS VIEW WITH view_count
CREATE OR REPLACE VIEW public.optimized_confessions AS
SELECT 
    c.id,
    c.content,
    c.university,
    c.user_id,
    c.created_at,
    COALESCE(r.reaction_data, '[]'::jsonb) as reaction_data,
    COALESCE(r.total_reactions, 0) as total_reactions,
    COALESCE(c.comment_count, comm.comment_count, 0) as comment_count,
    COALESCE(cl.claimer_ids, '[]'::jsonb) as claimer_ids,
    (COALESCE(r.total_reactions, 0) >= 20) as is_viral,
    COALESCE(c.post_type, 'anonymous_confession') as post_type,
    COALESCE(c.is_anonymous, true) as is_anonymous,
    c.author_name,
    c.author_avatar,
    c.author_username,
    c.image_url,
    COALESCE(c.repost_count, 0) as repost_count,
    COALESCE(c.view_count, 0) as view_count
FROM public.confessions c
LEFT JOIN (
    SELECT 
        confession_id,
        jsonb_agg(jsonb_build_object('u', user_id, 'e', emoji)) as reaction_data,
        COUNT(*) as total_reactions
    FROM public.confession_reactions
    GROUP BY confession_id
) r ON c.id = r.confession_id
LEFT JOIN (
    SELECT confession_id, COUNT(*) as comment_count
    FROM public.confession_comments
    GROUP BY confession_id
) comm ON c.id = comm.confession_id
LEFT JOIN (
    SELECT confession_id, jsonb_agg(claimer_id) as claimer_ids
    FROM public.confession_claims
    GROUP BY confession_id
) cl ON c.id = cl.confession_id;

GRANT SELECT ON public.optimized_confessions TO anon, authenticated;

-- 4. RPC TO ATOMICALLY INCREMENT CONFESSION VIEW COUNT
CREATE OR REPLACE FUNCTION public.increment_confession_view(p_confession_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_views integer;
BEGIN
    UPDATE public.confessions
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = p_confession_id
    RETURNING view_count INTO v_views;

    RETURN COALESCE(v_views, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.increment_confession_view(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.increment_confession_view(uuid) TO anon, authenticated;
