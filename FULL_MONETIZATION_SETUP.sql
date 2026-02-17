-- ====================================================
-- FULL MONETIZATION & ENGAGEMENT SETUP (v3.0)
-- ====================================================
-- Run this in your Supabase SQL Editor.

-- 1. CORE TABLES (UPDATED)
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    available_balance DECIMAL(12, 2) DEFAULT 0.00,
    pending_balance DECIMAL(12, 2) DEFAULT 0.00,
    total_earned DECIMAL(12, 2) DEFAULT 0.00,
    total_spent DECIMAL(12, 2) DEFAULT 0.00,
    currency TEXT DEFAULT 'NGN',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payout_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    bank_name TEXT,
    account_number TEXT,
    account_name TEXT,
    paypal_email TEXT,
    preferred_method TEXT CHECK (preferred_method IN ('bank', 'paypal')) DEFAULT 'bank',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    plan_type TEXT CHECK (plan_type IN ('Free', 'Premium')) DEFAULT 'Free',
    status TEXT CHECK (status IN ('active', 'expired', 'canceled', 'pending')) DEFAULT 'active',
    current_period_start TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE,
    paystack_subscription_id TEXT,
    paystack_customer_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.boosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('24h_boost', 'spotlight', 'super_swipe')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    multiplier DECIMAL(3, 1) DEFAULT 2.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.swipe_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    swipes_used INTEGER DEFAULT 0,
    last_reset TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.engagement_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    score INTEGER DEFAULT 0,
    daily_streak INTEGER DEFAULT 0,
    last_login TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- 2. EXTEND TRANSACTIONS
ALTER TABLE public.wallet_transactions 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'paystack',
ADD COLUMN IF NOT EXISTS gateway_response JSONB;

-- 3. FUNCTIONS & TRIGGERS

-- Visibility Ranking Formula
CREATE OR REPLACE FUNCTION get_user_visibility_score(user_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
    score_val DECIMAL := 0;
    is_premium BOOLEAN := FALSE;
    boost_mult DECIMAL := 1.0;
    eng_score INTEGER := 0;
    active_at TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT (plan_type = 'Premium' AND status = 'active') INTO is_premium FROM public.subscriptions WHERE user_id = user_uuid;
    SELECT MAX(multiplier) INTO boost_mult FROM public.boosts WHERE user_id = user_uuid AND expires_at > now();
    IF boost_mult IS NULL THEN boost_mult := 1.0; END IF;
    SELECT score INTO eng_score FROM public.engagement_scores WHERE user_id = user_uuid;
    IF eng_score IS NULL THEN eng_score := 0; END IF;
    SELECT last_seen_at INTO active_at FROM public.profiles WHERE id = user_uuid;
    
    IF active_at > now() - INTERVAL '1 day' THEN score_val := 100;
    ELSIF active_at > now() - INTERVAL '7 days' THEN score_val := 50;
    ELSE score_val := 10; END IF;

    IF is_premium THEN score_val := score_val + 200; END IF;
    score_val := score_val + (eng_score / 10.0);
    RETURN (score_val * boost_mult);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic Wallet Operations
DROP FUNCTION IF EXISTS public.increment_wallet_balance(UUID, DECIMAL);
DROP FUNCTION IF EXISTS public.decrement_wallet_balance(UUID, DECIMAL);

CREATE OR REPLACE FUNCTION increment_wallet_balance(wallet_uuid UUID, amount_val DECIMAL)
RETURNS void AS $$
BEGIN
    UPDATE public.wallets
    SET available_balance = available_balance + amount_val,
        updated_at = now()
    WHERE id = wallet_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_wallet_balance(wallet_uuid UUID, amount_val DECIMAL)
RETURNS void AS $$
BEGIN
    UPDATE public.wallets
    SET available_balance = available_balance - amount_val,
        total_spent = total_spent + amount_val,
        updated_at = now()
    WHERE id = wallet_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Swipe Limit Reset Logic
CREATE OR REPLACE FUNCTION reset_swipe_limits()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.last_reset < now() - INTERVAL '24 hours' THEN
        NEW.swipes_used := 0;
        NEW.last_reset := now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_swipe_limit_check ON public.swipe_limits;
CREATE TRIGGER on_swipe_limit_check
    BEFORE UPDATE ON public.swipe_limits
    FOR EACH ROW EXECUTE FUNCTION reset_swipe_limits();

-- 4. VIEWS (Dependencies follow tables/functions)

-- Active Discovery Feed
CREATE OR REPLACE VIEW discovery_feed_v3 AS
SELECT 
    p.*,
    get_user_visibility_score(p.id) as visibility_score,
    COALESCE(s.plan_type, 'Free') as plan_type,
    EXISTS (SELECT 1 FROM boosts b WHERE b.user_id = p.id AND b.expires_at > now()) as is_boosted
FROM 
    public.profiles p
LEFT JOIN 
    public.subscriptions s ON s.user_id = p.id;

-- Most Wanted Leaderboard
CREATE OR REPLACE VIEW leaderboard_most_wanted AS
SELECT 
    p.id, p.full_name, p.avatar_url, p.university,
    COUNT(s.id) as premium_swipes_received
FROM 
    public.profiles p
LEFT JOIN 
    public.swipes s ON s.swiped_id = p.id AND s.direction = 'right'
GROUP BY 
    p.id
ORDER BY 
    premium_swipes_received DESC;

-- Big Spenders Leaderboard
CREATE OR REPLACE VIEW leaderboard_big_spenders AS
SELECT 
    p.id, p.full_name, p.avatar_url, p.university,
    w.total_spent
FROM 
    public.profiles p
JOIN 
    public.wallets w ON w.user_id = p.id
ORDER BY 
    w.total_spent DESC;

-- Campus Stars Leaderboard
CREATE OR REPLACE VIEW leaderboard_campus_stars AS
SELECT 
    p.id, p.full_name, p.avatar_url, p.university,
    e.score as engagement_score, e.daily_streak
FROM 
    public.profiles p
JOIN 
    public.engagement_scores e ON e.user_id = p.id
ORDER BY 
    e.score DESC;

-- Payout Details Policies
ALTER TABLE public.payout_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own payout details" ON public.payout_details;
CREATE POLICY "Users can manage their own payout details" ON public.payout_details 
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. INITIALIZE DATA
INSERT INTO public.subscriptions (user_id) SELECT id FROM public.profiles ON CONFLICT (user_id) DO NOTHING;
INSERT INTO public.swipe_limits (user_id) SELECT id FROM public.profiles ON CONFLICT (user_id) DO NOTHING;
INSERT INTO public.engagement_scores (user_id) SELECT id FROM public.profiles ON CONFLICT (user_id) DO NOTHING;

-- 6. PAID SWIPE LOGIC
CREATE OR REPLACE FUNCTION process_swipe_payment(
    swiper_id UUID,
    swiped_id UUID,
    swipe_type TEXT -- 'standard' or 'premium'
)
RETURNS JSONB AS $$
DECLARE
    cost DECIMAL;
    reward DECIMAL;
    swiper_wallet_id UUID;
    swiped_wallet_id UUID;
    swiper_balance DECIMAL;
BEGIN
    -- Set costs
    IF swipe_type = 'premium' THEN
        cost := 5000.00;
        reward := 2500.00;
    ELSE
        cost := 500.00;
        reward := 250.00;
    END IF;

    -- Get wallets
    SELECT id, available_balance INTO swiper_wallet_id, swiper_balance 
    FROM public.wallets WHERE user_id = swiper_id;
    
    IF swiper_balance < cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance. Need ₦' || cost);
    END IF;

    SELECT id INTO swiped_wallet_id FROM public.wallets WHERE user_id = swiped_id;

    -- Deduct from Swiper
    UPDATE public.wallets 
    SET available_balance = available_balance - cost,
        total_spent = total_spent + cost,
        updated_at = now()
    WHERE id = swiper_wallet_id;

    INSERT INTO public.wallet_transactions (user_id, wallet_id, type, amount, status, description, metadata)
    VALUES (swiper_id, swiper_wallet_id, 'payment', cost, 'completed', 
            UPPER(swipe_type) || ' Swipe Request', jsonb_build_object('target_id', swiped_id, 'swipe_type', swipe_type));

    -- Credit Recipient (50% Split)
    IF swiped_wallet_id IS NOT NULL THEN
        UPDATE public.wallets 
        SET available_balance = available_balance + reward,
            total_earned = total_earned + reward,
            updated_at = now()
        WHERE id = swiped_wallet_id;

        INSERT INTO public.wallet_transactions (user_id, wallet_id, type, amount, status, description, metadata)
        VALUES (swiped_id, swiped_wallet_id, 'earning', reward, 'completed', 
                'Earning from ' || UPPER(swipe_type) || ' Swipe', jsonb_build_object('swiper_id', swiper_id, 'swipe_type', swipe_type));
    END IF;

    RETURN jsonb_build_object('success', true, 'type', 'paid', 'amount', cost);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. ACCEPT SWIPE LOGIC
CREATE OR REPLACE FUNCTION accept_swipe_request(swipe_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_swiper_id UUID;
    v_swiped_id UUID;
    v_match_id UUID;
BEGIN
    SELECT swiper_id, swiped_id INTO v_swiper_id, v_swiped_id
    FROM public.swipes WHERE id = swipe_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request not found or already processed');
    END IF;

    UPDATE public.swipes SET status = 'accepted' WHERE id = swipe_id;

    INSERT INTO public.matches (user1_id, user2_id, user_ids)
    VALUES (LEAST(v_swiper_id, v_swiped_id), GREATER(v_swiper_id, v_swiped_id), ARRAY[v_swiper_id, v_swiped_id])
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_match_id;

    RETURN jsonb_build_object('success', true, 'match_id', v_match_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. SECURITY & GRANTS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipe_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view their own boosts" ON public.boosts;
DROP POLICY IF EXISTS "Users can view their own limits" ON public.swipe_limits;
DROP POLICY IF EXISTS "Users can view their own scores" ON public.engagement_scores;

CREATE POLICY "Users can view their own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own boosts" ON public.boosts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own limits" ON public.swipe_limits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own scores" ON public.engagement_scores FOR SELECT USING (auth.uid() = user_id);

GRANT SELECT ON discovery_feed_v3 TO anon, authenticated;
GRANT SELECT ON leaderboard_most_wanted TO anon, authenticated;
GRANT SELECT ON leaderboard_big_spenders TO anon, authenticated;
GRANT SELECT ON leaderboard_campus_stars TO anon, authenticated;
