create table if not exists public.ai_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task text not null,
  input_summary text,
  result jsonb,
  provider text,
  model text,
  created_at timestamptz not null default now()
);

alter table public.ai_interactions enable row level security;

drop policy if exists "Users can view own ai interactions" on public.ai_interactions;
create policy "Users can view own ai interactions"
  on public.ai_interactions
  for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_app_admin());

drop policy if exists "Service role can manage ai interactions" on public.ai_interactions;
create policy "Service role can manage ai interactions"
  on public.ai_interactions
  for all
  to service_role
  using (true)
  with check (true);

create index if not exists idx_ai_interactions_user_created on public.ai_interactions(user_id, created_at desc);
create index if not exists idx_ai_interactions_task_created on public.ai_interactions(task, created_at desc);

revoke all on public.ai_interactions from public, anon;
grant select on public.ai_interactions to authenticated;
grant all on public.ai_interactions to service_role;
