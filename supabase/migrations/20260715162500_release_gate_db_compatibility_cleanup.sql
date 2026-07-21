-- Cleanup for compatibility wrappers from the release-gate lint pass.

drop function if exists public.get_hidden_content_counts(uuid);
create function public.get_hidden_content_counts(v_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_hidden_statuses integer := 0;
  v_hidden_snapshots integer := 0;
  v_has_status_hidden boolean := false;
begin
  if auth.uid() is null or auth.uid() <> v_user_id then
    return jsonb_build_object('hidden_statuses', 0, 'hidden_snapshots', 0);
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'status_updates'
      and column_name = 'is_hidden'
  ) into v_has_status_hidden;

  if v_has_status_hidden then
    execute
      'select count(*)::integer from public.status_updates where user_id = $1 and coalesce(is_hidden, false) = true'
      into v_hidden_statuses
      using v_user_id;
  end if;

  select count(*)::integer
  into v_hidden_snapshots
  from public.snapshots
  where user_id = v_user_id
    and coalesce(is_hidden, false) = true;

  return jsonb_build_object(
    'hidden_statuses', coalesce(v_hidden_statuses, 0),
    'hidden_snapshots', coalesce(v_hidden_snapshots, 0)
  );
end;
$$;

drop function if exists public.notify_internally(uuid, text, text, text, jsonb);
drop function if exists public.notify_internally(uuid, uuid, text, text, text, jsonb);

create function public.notify_internally(
    p_user_id uuid,
    p_type text,
    p_title text,
    p_body text,
    p_data jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
    result jsonb;
begin
    if auth.uid() is null then
        raise exception 'Not authorized';
    end if;

    if p_user_id <> auth.uid() then
        raise exception 'System-style notifications can only target the current user';
    end if;

    insert into public.notifications (
        user_id,
        recipient_id,
        type,
        title,
        content,
        metadata
    )
    values (
        p_user_id,
        p_user_id,
        p_type,
        p_title,
        p_body,
        coalesce(p_data, '{}'::jsonb)
    )
    returning to_jsonb(notifications.*) into result;

    return result;
end;
$$;

create function public.notify_internally(
    p_user_id uuid,
    p_actor_id uuid,
    p_type text,
    p_title text,
    p_body text,
    p_data jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
    result jsonb;
begin
    if auth.uid() is null then
        raise exception 'Not authorized';
    end if;

    if p_actor_id is not null and p_actor_id <> auth.uid() then
        raise exception 'Notification actor must be the current user';
    end if;

    if p_actor_id is null and p_user_id <> auth.uid() then
        raise exception 'System-style notifications can only target the current user';
    end if;

    insert into public.notifications (
        user_id,
        recipient_id,
        actor_id,
        sender_id,
        type,
        title,
        content,
        metadata
    )
    values (
        p_user_id,
        p_user_id,
        p_actor_id,
        p_actor_id,
        p_type,
        p_title,
        p_body,
        coalesce(p_data, '{}'::jsonb)
    )
    returning to_jsonb(notifications.*) into result;

    return result;
end;
$$;

revoke all on function public.get_hidden_content_counts(uuid) from public, anon;
revoke all on function public.notify_internally(uuid, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.notify_internally(uuid, uuid, text, text, text, jsonb) from public, anon, authenticated;

grant execute on function public.get_hidden_content_counts(uuid) to authenticated;
