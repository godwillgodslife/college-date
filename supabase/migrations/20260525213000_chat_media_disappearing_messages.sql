-- Chat hardening:
-- - Keep chat media private to match participants.
-- - Restore strict participant-only message inserts after the loose policy removal.
-- - Add per-match disappearing message settings.

alter table public.matches
add column if not exists disappearing_messages_seconds integer not null default 0;

alter table public.matches
drop constraint if exists matches_disappearing_messages_seconds_check;

alter table public.matches
add constraint matches_disappearing_messages_seconds_check
check (disappearing_messages_seconds in (0, 86400, 604800, 2592000));

alter table public.messages
add column if not exists expires_at timestamptz;

create index if not exists idx_messages_match_expires_at
on public.messages (match_id, expires_at);

create index if not exists idx_messages_expires_at
on public.messages (expires_at)
where expires_at is not null;

create or replace function public.set_message_expiry_from_match()
returns trigger
language plpgsql
set search_path to ''
as $$
declare
    v_seconds integer;
begin
    select disappearing_messages_seconds
    into v_seconds
    from public.matches
    where id = new.match_id;

    if coalesce(v_seconds, 0) > 0 and new.expires_at is null then
        new.expires_at := new.created_at + make_interval(secs => v_seconds);
    end if;

    return new;
end;
$$;

drop trigger if exists set_message_expiry_from_match on public.messages;
create trigger set_message_expiry_from_match
before insert on public.messages
for each row execute function public.set_message_expiry_from_match();

create or replace function public.update_match_disappearing_messages(
    p_match_id uuid,
    p_seconds integer
)
returns table(id uuid, disappearing_messages_seconds integer)
language plpgsql
security definer
set search_path to ''
as $$
begin
    if auth.uid() is null then
        raise exception 'Not authorized';
    end if;

    if p_seconds not in (0, 86400, 604800, 2592000) then
        raise exception 'Invalid disappearing message setting';
    end if;

    if not exists (
        select 1
        from public.matches m
        where m.id = p_match_id
          and auth.uid() in (m.user1_id, m.user2_id)
    ) then
        raise exception 'Not authorized';
    end if;

    update public.matches m
    set disappearing_messages_seconds = p_seconds
    where m.id = p_match_id
    returning m.id, m.disappearing_messages_seconds
    into id, disappearing_messages_seconds;

    return next;
end;
$$;

revoke execute on function public.update_match_disappearing_messages(uuid, integer) from public, anon;
grant execute on function public.update_match_disappearing_messages(uuid, integer) to authenticated;

drop policy if exists "Users can view messages in their matches" on public.messages;
create policy "Users can view messages in their matches"
on public.messages
for select
to authenticated
using (
    exists (
        select 1
        from public.matches m
        where m.id = messages.match_id
          and auth.uid() in (m.user1_id, m.user2_id)
    )
    and (messages.expires_at is null or messages.expires_at > now())
);

drop policy if exists "Users can send messages to their matches" on public.messages;
create policy "Users can send messages to their matches"
on public.messages
for insert
to authenticated
with check (
    auth.uid() = sender_id
    and exists (
        select 1
        from public.matches m
        where m.id = messages.match_id
          and auth.uid() in (m.user1_id, m.user2_id)
    )
);

drop policy if exists "Users can update message read state in their matches" on public.messages;
create policy "Users can update message read state in their matches"
on public.messages
for update
to authenticated
using (
    exists (
        select 1
        from public.matches m
        where m.id = messages.match_id
          and auth.uid() in (m.user1_id, m.user2_id)
    )
)
with check (
    exists (
        select 1
        from public.matches m
        where m.id = messages.match_id
          and auth.uid() in (m.user1_id, m.user2_id)
    )
);

revoke update on public.messages from authenticated;
grant update (is_read, metadata) on public.messages to authenticated;

insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', false)
on conflict (id) do update set public = false;

drop policy if exists "Chat media participants can read" on storage.objects;
create policy "Chat media participants can read"
on storage.objects
for select
to authenticated
using (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[1] = 'matches'
    and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and exists (
        select 1
        from public.matches m
        where m.id = ((storage.foldername(name))[2])::uuid
          and auth.uid() in (m.user1_id, m.user2_id)
    )
);

drop policy if exists "Chat media participants can upload" on storage.objects;
create policy "Chat media participants can upload"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[1] = 'matches'
    and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and exists (
        select 1
        from public.matches m
        where m.id = ((storage.foldername(name))[2])::uuid
          and auth.uid() in (m.user1_id, m.user2_id)
    )
);
