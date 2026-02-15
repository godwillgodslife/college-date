-- NOTIFICATION CONSTRAINT FIX
-- The error "violates check constraint notifications_type_check" means 'snapshot' is not an allowed type.
-- We need to expand the allowed types.

-- 1. Drop the old strict constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 2. Add the new, comprehensive constraint
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN (
        'match', 
        'message', 
        'view', 
        'payment', 
        'goal_reached', 
        'snapshot_reaction', 
        'status_update', 
        'system',
        'snapshot',    -- Was missing
        'like'         -- Was likely missing too
    ));
