-- ====================================================
-- FIX: wallet_transactions & wallets RLS Policies
-- ====================================================
-- Run this in your Supabase SQL Editor to fix the 403 errors.
-- Problem: RLS is enabled but only SELECT policies exist.
--          The app needs INSERT and UPDATE permissions too.

-- ====================================================
-- 1. FIX wallet_transactions TYPE constraint
-- ====================================================
-- The app uses types like 'payment', 'earning', 'subscription'
-- but the original CHECK only allows: 'deposit', 'swipe_purchase', 
-- 'swipe_reward', 'referral_bonus', 'withdrawal'

ALTER TABLE public.wallet_transactions 
DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

ALTER TABLE public.wallet_transactions 
ADD CONSTRAINT wallet_transactions_type_check 
CHECK (type IN (
    'deposit', 
    'swipe_purchase', 
    'swipe_reward', 
    'referral_bonus', 
    'withdrawal',
    'payment',        -- Used by paymentService.js
    'earning',        -- Used by process_swipe_payment
    'subscription'    -- Used for subscription purchases
));

-- ====================================================
-- 2. FIX wallet_transactions RLS Policies
-- ====================================================
-- Drop old SELECT-only policy
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.wallet_transactions;

-- SELECT: Users can view their own transactions
CREATE POLICY "Users can view their own transactions" ON public.wallet_transactions
FOR SELECT USING (auth.uid() = user_id);

-- INSERT: Users can create their own transactions
DROP POLICY IF EXISTS "Users can create their own transactions" ON public.wallet_transactions;
CREATE POLICY "Users can create their own transactions" ON public.wallet_transactions
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own transactions
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.wallet_transactions;
CREATE POLICY "Users can update their own transactions" ON public.wallet_transactions
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ====================================================
-- 3. FIX wallets RLS Policies
-- ====================================================
-- The app auto-creates wallets if they don't exist (paymentService.js line 19)

-- Keep existing SELECT
DROP POLICY IF EXISTS "Users can view their own wallet" ON public.wallets;
CREATE POLICY "Users can view their own wallet" ON public.wallets
FOR SELECT USING (auth.uid() = user_id);

-- INSERT: Users can create their own wallet
DROP POLICY IF EXISTS "Users can create their own wallet" ON public.wallets;
CREATE POLICY "Users can create their own wallet" ON public.wallets
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: Allow wallet balance updates (needed for direct updates)
DROP POLICY IF EXISTS "Users can update their own wallet" ON public.wallets;
CREATE POLICY "Users can update their own wallet" ON public.wallets
FOR UPDATE USING (auth.uid() = user_id);

-- ====================================================
-- 4. FIX wallet_transactions STATUS constraint
-- ====================================================
-- The code uses 'success' status but original CHECK only allows
-- 'pending', 'completed', 'failed'
ALTER TABLE public.wallet_transactions
DROP CONSTRAINT IF EXISTS wallet_transactions_status_check;

ALTER TABLE public.wallet_transactions
ADD CONSTRAINT wallet_transactions_status_check
CHECK (status IN ('pending', 'completed', 'failed', 'success'));

-- ====================================================
-- 5. ENABLE Realtime for wallet_transactions (for subscriptions)
-- ====================================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
EXCEPTION WHEN duplicate_object THEN
    NULL; -- already added
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
EXCEPTION WHEN duplicate_object THEN
    NULL; -- already added
END $$;

-- ====================================================
-- DONE! The 403 errors should now be resolved.
-- ====================================================
