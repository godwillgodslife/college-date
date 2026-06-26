alter table public.profiles
  add column if not exists ai_verification_status text not null default 'not_started',
  add column if not exists ai_verification_score numeric,
  add column if not exists ai_photo_origin text,
  add column if not exists ai_reviewed_at timestamptz,
  add column if not exists ai_review_summary text,
  add column if not exists ai_review_flags text[] not null default '{}';

create table if not exists public.ai_profile_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending',
  score numeric,
  photo_origin text,
  summary text,
  flags text[] not null default '{}',
  provider text,
  model text,
  raw_result jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_profile_reviews enable row level security;

drop policy if exists "Users can view own ai reviews" on public.ai_profile_reviews;
create policy "Users can view own ai reviews"
  on public.ai_profile_reviews
  for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_app_admin());

drop policy if exists "Service role can manage ai reviews" on public.ai_profile_reviews;
create policy "Service role can manage ai reviews"
  on public.ai_profile_reviews
  for all
  to service_role
  using (true)
  with check (true);

create index if not exists idx_ai_profile_reviews_user_created on public.ai_profile_reviews(user_id, created_at desc);
create index if not exists idx_profiles_ai_verification_status on public.profiles(ai_verification_status);

revoke all on public.ai_profile_reviews from public, anon;
grant select on public.ai_profile_reviews to authenticated;
grant all on public.ai_profile_reviews to service_role;
