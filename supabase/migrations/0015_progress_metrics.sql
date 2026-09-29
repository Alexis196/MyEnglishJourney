-- Daily rollup table. Phase 1 does not populate this via a scheduled job yet —
-- the dashboard computes live aggregates directly from exercise_attempts /
-- study_sessions / plan_days instead. The schema exists now so a future
-- nightly rollup job has a stable target without another migration.
create table public.progress_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_date date not null,
  lessons_completed integer not null default 0,
  exercises_completed integer not null default 0,
  exercises_correct integer not null default 0,
  minutes_studied integer not null default 0,
  new_vocab_count integer not null default 0,
  streak_snapshot integer not null default 0,

  unique (user_id, metric_date)
);

alter table public.progress_metrics enable row level security;

create policy "progress_metrics_select_own" on public.progress_metrics for select using (auth.uid() = user_id);
create policy "progress_metrics_insert_own" on public.progress_metrics for insert with check (auth.uid() = user_id);
create policy "progress_metrics_update_own" on public.progress_metrics for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "progress_metrics_delete_own" on public.progress_metrics for delete using (auth.uid() = user_id);
