-- Migration: Update confession_reactions emoji constraint
-- Adds the full emoji set used in the redesigned Confessions UI
-- New valid set: fire, laughing, see-no-evil, pray, crying

-- Drop the existing constraint (if it exists)
ALTER TABLE public.confession_reactions
    DROP CONSTRAINT IF EXISTS valid_emoji;

-- Re-add with the full emoji set used in the redesigned UI
-- Using unicode escapes for safety across encodings
ALTER TABLE public.confession_reactions
    ADD CONSTRAINT valid_emoji CHECK (
        emoji IN (
            U&'\D83D\DD25',  -- fire emoji
            U&'\D83D\DE02',  -- laughing emoji
            U&'\D83D\DE4A',  -- see-no-evil monkey
            U&'\D83D\DE4F',  -- pray/folded hands
            U&'\D83D\DE22',  -- crying emoji
            U&'\D83D\DC40'   -- eyes (kept for backward compatibility)
        )
    );
-- Note: eyes emoji is kept for backward compatibility with existing reactions in DB.
-- The frontend UI only shows fire, laughing, see-no-evil, pray, crying.
