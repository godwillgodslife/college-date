-- SETTINGS COLUMNS MIGRATION
-- Add settings columns to profiles table if they don't exist

DO $$
BEGIN
    -- Notification Preferences
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'match_notifications') THEN
        ALTER TABLE public.profiles ADD COLUMN match_notifications BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email_notifications') THEN
        ALTER TABLE public.profiles ADD COLUMN email_notifications BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'push_notifications') THEN
        ALTER TABLE public.profiles ADD COLUMN push_notifications BOOLEAN DEFAULT true;
    END IF;

    -- Privacy Settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'show_online_status') THEN
        ALTER TABLE public.profiles ADD COLUMN show_online_status BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'incognito_mode') THEN
        ALTER TABLE public.profiles ADD COLUMN incognito_mode BOOLEAN DEFAULT false;
    END IF;
END $$;
