-- 1. Create WALLETS table
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    balance DECIMAL(12, 2) DEFAULT 0.00,
    currency TEXT DEFAULT 'NGN',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create TRANSACTIONS table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('deposit', 'withdrawal', 'earning', 'payment')),
    amount DECIMAL(12, 2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
    reference TEXT UNIQUE, -- Flutterwave reference
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure wallet_id exists if table was created previously
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='wallet_id') THEN
        ALTER TABLE public.transactions ADD COLUMN wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. RLS Policies
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Wallets: Users can only see their own wallet
DROP POLICY IF EXISTS "Users can view their own wallet" ON public.wallets;
CREATE POLICY "Users can view their own wallet" ON public.wallets
FOR SELECT USING (auth.uid() = user_id);

-- Transactions: Users can only see transactions linked to their wallet
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions" ON public.transactions
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.wallets 
        WHERE wallets.id = wallet_id 
        AND wallets.user_id = auth.uid()
    )
);

-- 4. Function to automatically create a wallet for a new profile
CREATE OR REPLACE FUNCTION handle_new_profile_wallet()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.wallets (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_wallet ON public.profiles;
CREATE TRIGGER on_profile_created_wallet
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION handle_new_profile_wallet();

-- 5. Seed wallets for existing profiles if they don't have one
INSERT INTO public.wallets (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- 6. Atomic Increment Function for Wallet Balance
CREATE OR REPLACE FUNCTION increment_wallet_balance(wallet_id_param UUID, amount_param DECIMAL(12, 2))
RETURNS void AS $$
BEGIN
    UPDATE public.wallets
    SET balance = balance + amount_param,
        updated_at = timezone('utc'::text, now())
    WHERE id = wallet_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

