-- Native Android text messaging contract for staging validation.
--
-- Direct access remains denied for matches, profiles, and conversations. The
-- public RPCs below expose only participant-scoped projections and mutations.

create or replace function private.is_match_participant(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
    select auth.uid() is not null
       and p_match_id is not null
       and exists (
           select 1
           from public.matches m
           where m.id = p_match_id
             and auth.uid() in (m.user1_id, m.user2_id)
       );
$$;

revoke all on function private.is_match_participant(uuid) from public, anon;
grant execute on function private.is_match_participant(uuid) to authenticated;

create unique index if not exists messages_sender_client_nonce_unique
on public.messages (sender_id, (metadata ->> 'client_nonce'))
where nullif(metadata ->> 'client_nonce', '') is not null;

create or replace function public.get_native_conversations(
    p_limit integer default 50,
    p_offset integer default 0
)
returns table(
    match_id uuid,
    other_user_id uuid,
    other_display_name text,
    other_avatar_url text,
    other_last_active timestamptz,
    last_message_id uuid,
    last_message_content text,
    last_message_type text,
    last_message_sender_id uuid,
    last_message_is_read boolean,
    last_message_created_at timestamptz,
    unread_count bigint
)
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
    v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
    if v_user_id is null then
        raise exception 'not_authenticated';
    end if;

    return query
    select
        m.id,
        other_profile.id,
        coalesce(nullif(btrim(other_profile.full_name), ''), nullif(btrim(other_profile.username), '')),
        other_profile.avatar_url,
        coalesce(other_profile.last_active, other_profile.last_seen_at),
        last_message.id,
        last_message.content,
        last_message.type,
        last_message.sender_id,
        coalesce(last_message.is_read, true),
        last_message.created_at,
        (
            select count(*)
            from public.messages unread
            where unread.match_id = m.id
              and unread.sender_id <> v_user_id
              and coalesce(unread.is_read, false) = false
              and (unread.expires_at is null or unread.expires_at > now())
        )
    from public.matches m
    join public.profiles other_profile
      on other_profile.id = case
          when m.user1_id = v_user_id then m.user2_id
          else m.user1_id
      end
    left join lateral (
        select msg.id,
               msg.content,
               msg.type,
               msg.sender_id,
               msg.is_read,
               msg.created_at
        from public.messages msg
        where msg.match_id = m.id
          and (msg.expires_at is null or msg.expires_at > now())
        order by msg.created_at desc, msg.id desc
        limit 1
    ) last_message on true
    where v_user_id in (m.user1_id, m.user2_id)
    order by coalesce(last_message.created_at, m.created_at) desc, m.id
    limit v_limit
    offset v_offset;
end;
$$;

revoke all on function public.get_native_conversations(integer, integer) from public, anon;
grant execute on function public.get_native_conversations(integer, integer) to authenticated;

create or replace function public.get_native_messages(
    p_match_id uuid,
    p_before timestamptz default null,
    p_limit integer default 50
)
returns table(
    id uuid,
    match_id uuid,
    sender_id uuid,
    content text,
    type text,
    is_read boolean,
    created_at timestamptz,
    read_at timestamptz,
    expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
    v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
    if auth.uid() is null then
        raise exception 'not_authenticated';
    end if;

    if not private.is_match_participant(p_match_id) then
        raise exception 'not_authorized';
    end if;

    return query
    select page.id,
           page.match_id,
           page.sender_id,
           page.content,
           page.type,
           page.is_read,
           page.created_at,
           page.read_at,
           page.expires_at
    from (
        select msg.id,
               msg.match_id,
               msg.sender_id,
               msg.content,
               coalesce(msg.type, 'text') as type,
               coalesce(msg.is_read, false) as is_read,
               msg.created_at,
               msg.read_at,
               msg.expires_at
        from public.messages msg
        where msg.match_id = p_match_id
          and (p_before is null or msg.created_at < p_before)
          and (msg.expires_at is null or msg.expires_at > now())
        order by msg.created_at desc, msg.id desc
        limit v_limit
    ) page
    order by page.created_at, page.id;
end;
$$;

revoke all on function public.get_native_messages(uuid, timestamptz, integer) from public, anon;
grant execute on function public.get_native_messages(uuid, timestamptz, integer) to authenticated;

create or replace function public.send_native_text_message(
    p_match_id uuid,
    p_content text,
    p_client_nonce text
)
returns table(
    id uuid,
    match_id uuid,
    sender_id uuid,
    content text,
    type text,
    is_read boolean,
    created_at timestamptz,
    read_at timestamptz,
    expires_at timestamptz
)
language plpgsql
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_content text := btrim(coalesce(p_content, ''));
    v_nonce text := btrim(coalesce(p_client_nonce, ''));
    v_expiry_seconds integer;
    v_message public.messages%rowtype;
begin
    if v_user_id is null then
        raise exception 'not_authenticated';
    end if;

    if not private.is_match_participant(p_match_id) then
        raise exception 'not_authorized';
    end if;

    if char_length(v_content) < 1 or char_length(v_content) > 2000 then
        raise exception 'invalid_message_length';
    end if;

    if v_nonce !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
        raise exception 'invalid_client_nonce';
    end if;

    select msg.*
    into v_message
    from public.messages msg
    where msg.sender_id = v_user_id
      and msg.metadata ->> 'client_nonce' = v_nonce
    limit 1;

    if v_message.id is null then
        select coalesce(m.disappearing_messages_seconds, 0)
        into v_expiry_seconds
        from public.matches m
        where m.id = p_match_id;

        insert into public.messages (
            match_id,
            sender_id,
            content,
            type,
            metadata,
            expires_at
        )
        values (
            p_match_id,
            v_user_id,
            v_content,
            'text',
            jsonb_build_object('client_nonce', v_nonce),
            case
                when v_expiry_seconds > 0 then now() + make_interval(secs => v_expiry_seconds)
                else null
            end
        )
        returning * into v_message;
    elsif v_message.match_id <> p_match_id then
        raise exception 'client_nonce_conflict';
    end if;

    return query
    select v_message.id,
           v_message.match_id,
           v_message.sender_id,
           v_message.content,
           coalesce(v_message.type, 'text'),
           coalesce(v_message.is_read, false),
           v_message.created_at,
           v_message.read_at,
           v_message.expires_at;
end;
$$;

revoke all on function public.send_native_text_message(uuid, text, text) from public, anon;
grant execute on function public.send_native_text_message(uuid, text, text) to authenticated;

create or replace function public.mark_native_messages_read(p_match_id uuid)
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_updated integer;
begin
    if v_user_id is null then
        raise exception 'not_authenticated';
    end if;

    if not private.is_match_participant(p_match_id) then
        raise exception 'not_authorized';
    end if;

    update public.messages msg
    set is_read = true,
        read_at = coalesce(msg.read_at, now())
    where msg.match_id = p_match_id
      and msg.sender_id <> v_user_id
      and coalesce(msg.is_read, false) = false
      and (msg.expires_at is null or msg.expires_at > now());

    get diagnostics v_updated = row_count;
    return v_updated;
end;
$$;

revoke all on function public.mark_native_messages_read(uuid) from public, anon;
grant execute on function public.mark_native_messages_read(uuid) to authenticated;

drop policy if exists "Native match participants can read messages" on public.messages;
create policy "Native match participants can read messages"
on public.messages
for select
to authenticated
using (
    private.is_match_participant(match_id)
    and (expires_at is null or expires_at > now())
);

revoke all on public.messages from anon, authenticated;
grant select (
    id,
    match_id,
    sender_id,
    content,
    is_read,
    created_at,
    read_at,
    type,
    expires_at
) on public.messages to authenticated;

-- Rollback:
-- 1. Revoke authenticated execution on the four public native messaging RPCs.
-- 2. Drop the four public RPCs and private.is_match_participant(uuid).
-- 3. Drop "Native match participants can read messages" and revoke the
--    authenticated column SELECT grant on public.messages.
-- 4. Drop messages_sender_client_nonce_unique.
