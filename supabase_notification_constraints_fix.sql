-- NOTIFICATION CONSTRAINT FIX
-- The error "violates check constraint notifications_type_check" happens when internal types are missing.
-- We are expanding the allowed types to cover all modern app interactions.

-- 1. Drop the old strict constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 2. Add the new, comprehensive constraint
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN (
        'match',             -- Success
        'message',           -- Legacy
        'new_message',       -- High-fidelity system
        'view',              -- Legacy
        'profile_view',      -- High-fidelity system
        'payment',           -- Wallet events
        'goal_reached',      -- Engagement
        'snapshot_reaction', -- Social
        'status_update',     -- Timeline
        'system',            -- Alerts
        'snapshot',          -- Media
        'like',              -- Discovery
        'swipe_received',    -- Inbound request
        'swipe_accepted',    -- Match formed via Request
        'super_swipe'        -- Premium
    ));
