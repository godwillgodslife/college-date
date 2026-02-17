-- ====================================================
-- HYBRID MONETIZATION & ENGAGEMENT SCHEMA (v3.0)
-- ====================================================

-- 1. SUBSCRIPTIONS Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    plan_type TEXT CHECK (plan_type IN ('Free', 'Premium')) DEFAULT 'Free',
    status TEXT CHECK (status IN ('active', 'expired', 'canceled', 'pending')) DEFAULT 'active',
    current_period_start TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE,
    paystack_subscription_id TEXT, -- Optional, for recurring info
    paystack_customer_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- 2. BOOSTS Table
CREATE TABLE IF NOT EXISTS public.boosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('24h_boost', 'spotlight', 'super_swipe')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    multiplier DECIMAL(3, 1) DEFAULT 2.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. SWIPE_LIMITS Table
CREATE TABLE IF NOT EXISTS public.swipe_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    swipes_used INTEGER DEFAULT 0,
    last_reset TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- 4. ENGAGEMENT_SCORE Table
CREATE TABLE IF NOT EXISTS public.engagement_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    score INTEGER DEFAULT 0,
    daily_streak INTEGER DEFAULT 0,
    last_login TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- 5. Extend TRANSACTIONS for Paystack & Microtransactions
-- (Assuming public.wallet_transactions exists from previous schema)
ALTER TABLE public.wallet_transactions 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'paystack',
ADD COLUMN IF NOT EXISTS gateway_response JSONB;

-- 6. DISCOVERY VISIBILITY LOGIC (RPC)
CREATE OR REPLACE FUNCTION get_user_visibility_score(user_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
    score_val DECIMAL := 0;
    is_premium BOOLEAN := FALSE;
    boost_mult DECIMAL := 1.0;
    eng_score INTEGER := 0;
    active_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- 1. Check Subscription
    SELECT (plan_type = 'Premium' AND status = 'active') INTO is_premium 
    FROM public.subscriptions WHERE user_id = user_uuid;
    
    -- 2. Check Active Boosts
    SELECT MAX(multiplier) INTO boost_mult 
    FROM public.boosts WHERE user_id = user_uuid AND expires_at > now();
    IF boost_mult IS NULL THEN boost_mult := 1.0; END IF;

    -- 3. Get Engagement Score
    SELECT score INTO eng_score 
    FROM public.engagement_scores WHERE user_id = user_uuid;
    IF eng_score IS NULL THEN eng_score := 0; END IF;

    -- 4. Get Last Activity (Recency)
    SELECT last_active INTO active_at FROM public.profiles WHERE id = user_uuid;
    
    -- Formula Core: 
    -- Base logic: (Recency weight) + (Engagement weight) + (Subscription bonus)
    -- Multiplied by Boost
    
    -- Recency weight: 1.0 for active within 24h, degrading over 7 days
    IF active_at > now() - INTERVAL '1 day' THEN
        score_val := 100;
    ELSIF active_at > now() - INTERVAL '7 days' THEN
        score_val := 50;
    ELSE
        score_val := 10;
    END IF;

    -- Subscription bonus
    IF is_premium THEN score_val := score_val + 200; END IF;

    -- Engagement contribution
    score_val := score_val + (eng_score / 10.0);

    RETURN (score_val * boost_mult);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. DISCOVERY VIEW (Dynamic Rotation)
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

-- 8. SWIPE LIMIT RESET TRIGGER
CREATE OR REPLACE FUNCTION reset_swipe_limits()
RETURNS TRIGGER AS $$
BEGIN
    -- Reset if last_reset was more than 24 hours ago
    IF NEW.last_reset < now() - INTERVAL '24 hours' THEN
        NEW.swipes_used := 0;
        NEW.last_reset := now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_swipe_limit_check
    BEFORE UPDATE ON public.swipe_limits
    FOR EACH ROW EXECUTE FUNCTION reset_swipe_limits();

-- 9. INITIALIZE DATA FOR EXISTING USERS
INSERT INTO public.subscriptions (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.swipe_limits (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.engagement_scores (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- 10. POLICIES FOR NEW TABLES
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipe_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own boosts" ON public.boosts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own limits" ON public.swipe_limits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own scores" ON public.engagement_scores FOR SELECT USING (auth.uid() = user_id);

-- Discovery view needs to be accessible
GRANT SELECT ON discovery_feed_v3 TO anon, authenticated;
