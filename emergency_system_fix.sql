-- ==========================================
-- EMERGENCY SYSTEM FIX: RELAX CONSTRAINTS
-- ==========================================

-- 1. Relax Restrictive Constraints
-- This ensures the DB accepts 'Male'/'Female' (UI) and solves current crashes
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_gender_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add flexible constraints that allow common formats
ALTER TABLE public.profiles ADD CONSTRAINT profiles_gender_check 
  CHECK (LOWER(gender) IN ('male', 'female', 'other'));

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (LOWER(role) IN ('male', 'female', 'user', 'admin'));

-- 2. Create Profile/Wallet Generation Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT;
    v_gender TEXT;
BEGIN
  -- Standardize for UI (Capitalized) and DB (Lowercase)
  v_role := INITCAP(COALESCE(NEW.raw_user_meta_data->>'role', 'Male'));
  v_gender := LOWER(v_role);

  -- Insert into Profiles using the exact schema identified
  INSERT INTO public.profiles (
    id, email, full_name, gender, age, university, bio, role, free_swipes, referred_by
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    v_gender, -- gender
    19,       -- age
    'Campus', -- university
    '',       -- bio
    v_role,   -- role
    20,       -- free_swipes
    (NEW.raw_user_meta_data->>'referred_by')::UUID
  ) ON CONFLICT (id) DO NOTHING;

  -- Insert into Wallets
  INSERT INTO public.wallets (user_id, available_balance)
  VALUES (NEW.id, 0.00)
  ON CONFLICT (user_id) DO NOTHING;

  -- Insert into Subscriptions
  INSERT INTO public.subscriptions (user_id, plan_type, status)
  VALUES (NEW.id, 'Free', 'active')
  ON CONFLICT (user_id) DO NOTHING;

  -- Insert into Swipe Limits
  INSERT INTO public.swipe_limits (user_id, swipes_used)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Bind trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. RETROACTIVE FIX: Repair existing broken accounts
DO $$
DECLARE
    user_record RECORD;
    v_role TEXT;
    v_gender TEXT;
BEGIN
    FOR user_record IN SELECT * FROM auth.users LOOP
        v_role := INITCAP(COALESCE(user_record.raw_user_meta_data->>'role', 'Male'));
        v_gender := LOWER(v_role);
        
        -- Profile
        INSERT INTO public.profiles (
            id, email, full_name, gender, age, university, bio, role, free_swipes, referred_by
        )
        VALUES (
            user_record.id, 
            user_record.email,
            COALESCE(user_record.raw_user_meta_data->>'full_name', user_record.email), 
            v_gender,
            19,
            'Campus',
            '',
            v_role,
            20,
            (user_record.raw_user_meta_data->>'referred_by')::UUID
        ) ON CONFLICT (id) DO NOTHING;

        -- Wallet
        INSERT INTO public.wallets (user_id, available_balance)
        VALUES (user_record.id, 0.00)
        ON CONFLICT (user_id) DO NOTHING;

        -- Subscriptions
        INSERT INTO public.subscriptions (user_id, plan_type)
        VALUES (user_record.id, 'Free')
        ON CONFLICT (user_id) DO NOTHING;

        -- Limits
        INSERT INTO public.swipe_limits (user_id)
        VALUES (user_record.id)
        ON CONFLICT (user_id) DO NOTHING;
    END LOOP;
END $$;
