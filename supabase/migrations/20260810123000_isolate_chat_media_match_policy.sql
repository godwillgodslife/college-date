-- Prevent chat-media policy evaluation from breaking unrelated storage operations.
-- Authenticated clients intentionally have no direct SELECT grant on public.matches,
-- so storage policies must use a narrow privileged predicate instead of querying it.

create or replace function public.can_access_match_media(p_match_id_text text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_match_id uuid;
begin
  if v_user_id is null
     or p_match_id_text is null
     or p_match_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;

  v_match_id := p_match_id_text::uuid;

  return exists (
    select 1
    from public.matches m
    where m.id = v_match_id
      and v_user_id in (m.user1_id, m.user2_id)
  );
end;
$$;

revoke all on function public.can_access_match_media(text) from public;
revoke all on function public.can_access_match_media(text) from anon;
grant execute on function public.can_access_match_media(text) to authenticated;
grant execute on function public.can_access_match_media(text) to service_role;

drop policy if exists "Chat media participants can read" on storage.objects;
create policy "Chat media participants can read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-media'
  and (storage.foldername(name))[1] = 'matches'
  and public.can_access_match_media((storage.foldername(name))[2])
);

drop policy if exists "Chat media participants can upload" on storage.objects;
create policy "Chat media participants can upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-media'
  and (storage.foldername(name))[1] = 'matches'
  and public.can_access_match_media((storage.foldername(name))[2])
);

-- Rollback:
-- 1. Recreate the two policies from 20260525213000_chat_media_disappearing_messages.sql.
-- 2. Drop function public.can_access_match_media(text).
