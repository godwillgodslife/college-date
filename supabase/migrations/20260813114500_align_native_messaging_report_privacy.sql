-- Align native messaging with the existing matched-profile privacy contract:
-- a non-dismissed report in either direction disables chat access.

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
             and not exists (
                 select 1
                 from public.reports r
                 where (
                     (r.reporter_id = m.user1_id and r.reported_id = m.user2_id)
                     or (r.reporter_id = m.user2_id and r.reported_id = m.user1_id)
                 )
                 and coalesce(r.status, 'pending') <> 'dismissed'
             )
       );
$$;

revoke all on function private.is_match_participant(uuid) from public, anon;
grant execute on function private.is_match_participant(uuid) to authenticated;

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
      and private.is_match_participant(m.id)
    order by coalesce(last_message.created_at, m.created_at) desc, m.id
    limit v_limit
    offset v_offset;
end;
$$;

revoke all on function public.get_native_conversations(integer, integer) from public, anon;
grant execute on function public.get_native_conversations(integer, integer) to authenticated;

-- Rollback:
-- Restore private.is_match_participant(uuid) and get_native_conversations from
-- 20260813103000_native_text_messaging_contract.sql.
