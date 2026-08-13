-- Make concurrent retries with the same client nonce return the message that
-- won the insert race instead of surfacing a unique-index error.

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

        begin
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
        exception
            when unique_violation then
                select msg.*
                into v_message
                from public.messages msg
                where msg.sender_id = v_user_id
                  and msg.metadata ->> 'client_nonce' = v_nonce
                limit 1;
        end;
    end if;

    if v_message.id is null or v_message.match_id <> p_match_id then
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

-- Rollback:
-- Restore public.send_native_text_message(uuid, text, text) from
-- 20260813103000_native_text_messaging_contract.sql.
