-- Restore onboarding photo/profile writes after production storage hardening.
-- The app stores each user's profile photos under profile-photos/<auth.uid()>/...
-- Keep bucket listing locked down while allowing owners to upload/read/update/delete their own objects.
-- Also allow authenticated users to create/update their own profiles during onboarding.

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Profile photo owners can upload" on storage.objects;
drop policy if exists "Profile photo owners can read own files" on storage.objects;
drop policy if exists "Profile photo owners can update own files" on storage.objects;
drop policy if exists "Profile photo owners can delete own files" on storage.objects;
drop policy if exists "Authenticated users can upload profile photos" on storage.objects;
drop policy if exists "Authenticated users can update own profile photos" on storage.objects;
drop policy if exists "Authenticated users can read own profile photos" on storage.objects;
drop policy if exists "Users can insert own profile during onboarding" on public.profiles;
drop policy if exists "Users can update own profile during onboarding" on public.profiles;
drop policy if exists "Users can read own profile during onboarding" on public.profiles;

create policy "Profile photo owners can upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-photos'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

create policy "Profile photo owners can read own files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-photos'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

create policy "Profile photo owners can update own files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-photos'
  and (select auth.uid())::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'profile-photos'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

create policy "Profile photo owners can delete own files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-photos'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

grant select, insert, update on public.profiles to authenticated;

create policy "Users can insert own profile during onboarding"
on public.profiles
for insert
to authenticated
with check (id = (select auth.uid()));

create policy "Users can update own profile during onboarding"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "Users can read own profile during onboarding"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));
