alter table public.profiles
    add column if not exists push_token text;

comment on column public.profiles.push_token is
    'Legacy/native push token fallback. Primary device records live in user_notification_devices.';
