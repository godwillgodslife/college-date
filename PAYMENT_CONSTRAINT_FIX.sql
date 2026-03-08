-- ==============================================================================
-- UNIVERSAL PAYMENT CONSTRAINT FIX (MARCH 7)
-- This script fixes the "violated by some row" error by including ALL 
-- transaction types used across the entire system.
-- ==============================================================================

-- 1. DROP the old restrictive constraints
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_status_check;

-- 2. ADD the Comprehensive TYPE constraint
-- Includes: standard, gifts, referrals, subscriptions, and legacy earnings
ALTER TABLE public.wallet_transactions
ADD CONSTRAINT wallet_transactions_type_check
CHECK (type IN (
    'deposit', 
    'withdrawal', 
    'transfer', 
    'payment', 
    'swipe_purchase', 
    'swipe_reward', 
    'subscription', 
    'boost_purchase', 
    'gift_purchase', 
    'gift_received', 
    'referral_bonus', 
    'cash_bonus',
    'earning',
    'bonus',
    'refund',
    'payout',
    'system_credit'
));

-- 3. ADD the Comprehensive STATUS constraint
-- Some triggers use 'success', some use 'completed'. This allows both.
ALTER TABLE public.wallet_transactions
ADD CONSTRAINT wallet_transactions_status_check
CHECK (status IN (
    'pending', 
    'completed', 
    'failed', 
    'success', 
    'cancelled',
    'refunded'
));

-- 4. Enable Realtime if not already enabled (Crucial for Premium updates)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'wallet_transactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping Realtime publication check: %', SQLERRM;
END $$;

-- Done! Try running the Premium upgrade now.
