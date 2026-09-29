create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null check (activity_type in ('lesson', 'exercise', 'vocabulary_review', 'speaking', 'review')),
  lesson_id uuid references public.lessons(id) on delete set null,
  plan_day_id uuid references public.plan_days(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer check (duration_seconds >= 0)
);

create index study_sessions_user_started_idx on public.study_sessions (user_id, started_at);

alter table public.study_sessions enable row level security;

create policy "study_sessions_select_own" on public.study_sessions for select using (auth.uid() = user_id);
create policy "study_sessions_insert_own" on public.study_sessions for insert with check (auth.uid() = user_id);
create policy "study_sessions_update_own" on public.study_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "study_sessions_delete_own" on public.study_sessions for delete using (auth.uid() = user_id);
