-- The College Date staging schema baseline
-- Source: production metadata from Supabase project gedoyoleoscgxgdqszzc on 2026-08-01.
-- Scope: Storage bucket configuration, staging-safe Storage policies, and Realtime publication membership.
-- No storage.objects rows, media files, or production user records are included.

-- Bucket configuration captured from production metadata.
-- Public buckets remain public for asset URL compatibility; object listing and writes
-- are controlled with Storage RLS policies below.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
    ('avatars', 'avatars', true, null, null),
    ('chat-media', 'chat-media', false, null, null),
    ('profile-photos', 'profile-photos', true, null, null),
    ('snap_media', 'snap_media', true, null, null),
    ('snapshot-media', 'snapshot-media', true, null, null),
    ('status-media', 'status-media', true, null, null),
    ('voice-intros', 'voice-intros', true, null, null)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Staging-safe storage policies. Production has duplicate legacy upload policies
-- and some policies assigned to {public}; this baseline uses authenticated-only,
-- owner-folder policies where possible.

create policy "Profile photo owners can upload"
on storage.objects for insert
to authenticated
with check (
    bucket_id = 'profile-photos'
    and ((select auth.uid())::text = (storage.foldername(name))[1])
);

create policy "Profile photo owners can read own files"
on storage.objects for select
to authenticated
using (
    bucket_id = 'profile-photos'
    and ((select auth.uid())::text = (storage.foldername(name))[1])
);

create policy "Profile photo owners can update own files"
on storage.objects for update
to authenticated
using (
    bucket_id = 'profile-photos'
    and ((select auth.uid())::text = (storage.foldername(name))[1])
)
with check (
    bucket_id = 'profile-photos'
    and ((select auth.uid())::text = (storage.foldername(name))[1])
);

create policy "Profile photo owners can delete own files"
on storage.objects for delete
to authenticated
using (
    bucket_id = 'profile-photos'
    and ((select auth.uid())::text = (storage.foldername(name))[1])
);

create policy "Voice intro owners can upload"
on storage.objects for insert
to authenticated
with check (
    bucket_id = 'voice-intros'
    and ((select auth.uid())::text = (storage.foldername(name))[1])
);

create policy "Voice intro owners can manage"
on storage.objects for all
to authenticated
using (
    bucket_id = 'voice-intros'
    and ((select auth.uid())::text = (storage.foldername(name))[1])
)
with check (
    bucket_id = 'voice-intros'
    and ((select auth.uid())::text = (storage.foldername(name))[1])
);

create policy "Status media owners can upload"
on storage.objects for insert
to authenticated
with check (
    bucket_id in ('status-media', 'snapshot-media', 'snap_media')
    and ((select auth.uid())::text = (storage.foldername(name))[1])
);

create policy "Status media owners can manage"
on storage.objects for all
to authenticated
using (
    bucket_id in ('status-media', 'snapshot-media', 'snap_media')
    and ((select auth.uid())::text = (storage.foldername(name))[1])
)
with check (
    bucket_id in ('status-media', 'snapshot-media', 'snap_media')
    and ((select auth.uid())::text = (storage.foldername(name))[1])
);

create policy "Chat media participants can read"
on storage.objects for select
to authenticated
using (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[1] = 'matches'
    and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and exists (
        select 1
        from public.matches m
        where m.id = ((storage.foldername(objects.name))[2])::uuid
          and ((select auth.uid()) = m.user1_id or (select auth.uid()) = m.user2_id)
    )
);

create policy "Chat media participants can upload"
on storage.objects for insert
to authenticated
with check (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[1] = 'matches'
    and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and exists (
        select 1
        from public.matches m
        where m.id = ((storage.foldername(objects.name))[2])::uuid
          and ((select auth.uid()) = m.user1_id or (select auth.uid()) = m.user2_id)
    )
);

-- Realtime membership captured from production metadata.
-- Supabase manages the realtime schema internally; do not modify realtime tables directly.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.wallet_transactions;
alter publication supabase_realtime add table public.wallets;
