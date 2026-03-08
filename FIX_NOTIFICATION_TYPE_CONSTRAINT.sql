-- ================================================================
-- FIX: notifications_type_check constraint violation
-- Run this in Supabase SQL Editor
-- ================================================================

-- Step 1: See what unknown types currently exist in the table
SELECT DISTINCT type, COUNT(*) as row_count
FROM public.notifications
GROUP BY type
ORDER BY type;

-- Step 2: Drop the old restrictive constraint
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Step 3: Remap any existing rows whose type is NOT in our new
--         allowed list → set them to 'system' so the constraint
--         can be added without failing on existing data.
UPDATE public.notifications
SET type = 'system'
WHERE type NOT IN (
    'match', 'message', 'view', 'payment', 'system',
    'status_update', 'goal_reached', 'snapshot_reaction',
    'like', 'super_swipe', 'swipe_request', 'gift',
    'gift_received', 'payment_received', 'referral_bonus',
    'wallet_topup', 'boost', 'profile_view', 'new_match',
    'request_accepted', 'request_declined'
);

-- Step 4: Re-add the constraint with ALL types the app uses
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
        -- Original types
        'match',
        'message',
        'view',
        'payment',
        'system',
        'status_update',
        'goal_reached',
        'snapshot_reaction',
        -- App-added types
        'like',
        'super_swipe',
        'swipe_request',
        'gift',
        'gift_received',
        'payment_received',
        'referral_bonus',
        'wallet_topup',
        'boost',
        'profile_view',
        'new_match',
        'request_accepted',
        'request_declined'
    )
);

-- Step 5: Verify — should show the new constraint definition
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conname = 'notifications_type_check'
  AND conrelid = 'public.notifications'::regclass;
