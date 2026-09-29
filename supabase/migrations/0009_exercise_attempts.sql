create table public.exercise_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  attempt_number integer not null default 1 check (attempt_number > 0),
  response jsonb not null,
  is_correct boolean,
  score numeric(5, 2) check (score is null or (score >= 0 and score <= 100)),
  ai_feedback jsonb,
  evaluation_status text not null check (
    evaluation_status in ('auto_correct', 'auto_incorrect', 'ai_pending', 'ai_evaluated', 'error')
  ),
  submitted_at timestamptz not null default now()
);

create index exercise_attempts_user_exercise_submitted_idx
  on public.exercise_attempts (user_id, exercise_id, submitted_at desc);

alter table public.exercise_attempts enable row level security;

create policy "exercise_attempts_select_own" on public.exercise_attempts for select using (auth.uid() = user_id);
create policy "exercise_attempts_insert_own" on public.exercise_attempts for insert with check (auth.uid() = user_id);
create policy "exercise_attempts_update_own" on public.exercise_attempts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "exercise_attempts_delete_own" on public.exercise_attempts for delete using (auth.uid() = user_id);
