-- Remaining linked-lint fixes for stale legacy functions.

drop function if exists public.get_hidden_content_counts(uuid);
create function public.get_hidden_content_counts(v_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_hidden_snapshots integer := 0;
begin
  if auth.uid() is null or auth.uid() <> v_user_id then
    return jsonb_build_object('hidden_statuses', 0, 'hidden_snapshots', 0);
  end if;

  select count(*)::integer
  into v_hidden_snapshots
  from public.snapshots
  where user_id = v_user_id
    and coalesce(is_hidden, false) = true;

  return jsonb_build_object(
    'hidden_statuses', 0,
    'hidden_snapshots', coalesce(v_hidden_snapshots, 0)
  );
end;
$$;

drop function if exists public.ghost_notification_job();

create or replace function public.calculate_completion_score()
returns trigger
language plpgsql
set search_path to ''
as $$
declare
  v_profile jsonb := to_jsonb(new);
  v_score integer := 0;
begin
  if coalesce(v_profile->>'full_name', '') <> '' then
    v_score := v_score + 15;
  end if;

  if coalesce(v_profile->>'bio', '') <> '' then
    v_score := v_score + 15;
  end if;

  if coalesce(v_profile->>'university', '') <> '' then
    v_score := v_score + 10;
  end if;

  if coalesce(v_profile->>'gender', '') <> '' then
    v_score := v_score + 10;
  end if;

  if coalesce(v_profile->>'date_of_birth', '') <> ''
     or coalesce(v_profile->>'age', '') <> '' then
    v_score := v_score + 10;
  end if;

  if coalesce(v_profile->>'avatar_url', '') <> ''
     or (
       jsonb_typeof(v_profile->'photos') = 'array'
       and jsonb_array_length(v_profile->'photos') > 0
     ) then
    v_score := v_score + 25;
  end if;

  if coalesce(v_profile->>'interests', '') <> ''
     or (
       jsonb_typeof(v_profile->'interests') = 'array'
       and jsonb_array_length(v_profile->'interests') > 0
     ) then
    v_score := v_score + 15;
  end if;

  new.completion_score := least(v_score, 100);
  return new;
end;
$$;

revoke all on function public.get_hidden_content_counts(uuid) from public, anon;
grant execute on function public.get_hidden_content_counts(uuid) to authenticated;
