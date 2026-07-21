create table if not exists public.feed_impressions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    entity_type text not null check (entity_type in ('profile', 'confession')),
    entity_id uuid not null,
    first_seen_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now(),
    seen_count integer not null default 1 check (seen_count >= 0),
    last_source text,
    last_engaged_at timestamptz,
    metadata jsonb not null default '{}'::jsonb,
    unique (user_id, entity_type, entity_id)
);

create index if not exists idx_feed_impressions_user_type_seen
    on public.feed_impressions (user_id, entity_type, last_seen_at desc);

create index if not exists idx_feed_impressions_entity
    on public.feed_impressions (entity_type, entity_id);

alter table public.feed_impressions enable row level security;

drop policy if exists "Users can view own feed impressions" on public.feed_impressions;
create policy "Users can view own feed impressions"
    on public.feed_impressions
    for select
    to authenticated
    using (auth.uid() = user_id);

drop policy if exists "Users can create own feed impressions" on public.feed_impressions;
create policy "Users can create own feed impressions"
    on public.feed_impressions
    for insert
    to authenticated
    with check (auth.uid() = user_id);

drop policy if exists "Users can update own feed impressions" on public.feed_impressions;
create policy "Users can update own feed impressions"
    on public.feed_impressions
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can delete own feed impressions" on public.feed_impressions;
create policy "Users can delete own feed impressions"
    on public.feed_impressions
    for delete
    to authenticated
    using (auth.uid() = user_id);

grant select, insert, update, delete on public.feed_impressions to authenticated;

create or replace function public.record_feed_impression(
    p_entity_type text,
    p_entity_id uuid,
    p_source text default null,
    p_engaged boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid := auth.uid();
begin
    if v_user_id is null then
        return jsonb_build_object('success', false, 'error', 'not_authenticated');
    end if;

    if p_entity_type not in ('profile', 'confession') then
        return jsonb_build_object('success', false, 'error', 'invalid_entity_type');
    end if;

    insert into public.feed_impressions (
        user_id,
        entity_type,
        entity_id,
        first_seen_at,
        last_seen_at,
        seen_count,
        last_source,
        last_engaged_at
    )
    values (
        v_user_id,
        p_entity_type,
        p_entity_id,
        now(),
        now(),
        1,
        nullif(p_source, ''),
        case when p_engaged then now() else null end
    )
    on conflict (user_id, entity_type, entity_id)
    do update set
        last_seen_at = now(),
        seen_count = public.feed_impressions.seen_count + 1,
        last_source = coalesce(nullif(p_source, ''), public.feed_impressions.last_source),
        last_engaged_at = case
            when p_engaged then now()
            else public.feed_impressions.last_engaged_at
        end;

    return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.record_feed_impression(text, uuid, text, boolean) from public, anon;
grant execute on function public.record_feed_impression(text, uuid, text, boolean) to authenticated;
