alter table public.profiles
    add column if not exists message_notifications boolean not null default true,
    add column if not exists request_notifications boolean not null default true,
    add column if not exists profile_activity_notifications boolean not null default true,
    add column if not exists social_notifications boolean not null default true,
    add column if not exists vibration_enabled boolean not null default true,
    add column if not exists message_previews_enabled boolean not null default true,
    add column if not exists quiet_hours_enabled boolean not null default false,
    add column if not exists quiet_hours_start time without time zone not null default time '22:00',
    add column if not exists quiet_hours_end time without time zone not null default time '07:00',
    add column if not exists marketing_notifications boolean not null default true;

comment on column public.profiles.message_notifications is
    'Allows users to receive external alerts for chat messages.';
comment on column public.profiles.request_notifications is
    'Allows users to receive external alerts for message and connection requests.';
comment on column public.profiles.profile_activity_notifications is
    'Allows users to receive external alerts for profile views and profile activity.';
comment on column public.profiles.social_notifications is
    'Allows users to receive external alerts for social activity such as confessions and reactions.';
comment on column public.profiles.vibration_enabled is
    'Controls in-app/native haptic feedback for foreground notifications.';
comment on column public.profiles.message_previews_enabled is
    'Controls whether push/email message notifications include message preview text.';
comment on column public.profiles.quiet_hours_enabled is
    'Suppresses foreground sound, haptics, and toast-style interruptions during the quiet hours window.';
comment on column public.profiles.quiet_hours_start is
    'Local quiet-hours start time.';
comment on column public.profiles.quiet_hours_end is
    'Local quiet-hours end time.';
comment on column public.profiles.marketing_notifications is
    'Allows users to receive non-critical marketing and digest notifications.';
