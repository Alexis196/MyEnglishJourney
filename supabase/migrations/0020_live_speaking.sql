-- Live (real-time) speaking practice. Additive: a new table plus one extra AI usage activity type.

-- 1) One row per conversation. The transcript and feedback are written when the student ends it.
create table if not exists public.live_speaking_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('free', 'scenario')),
  scenario text,
  level text,
  model text not null,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned', 'failed')),
  max_seconds integer not null check (max_seconds > 0),
  duration_seconds integer check (duration_seconds >= 0),
  -- [{ "role": "user" | "tutor", "text": "..." }]
  transcript jsonb,
  ai_feedback jsonb,
  estimated_cost_usd numeric(10, 6) not null default 0,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists live_speaking_sessions_user_started_idx
  on public.live_speaking_sessions (user_id, started_at desc);

alter table public.live_speaking_sessions enable row level security;

create policy "live_speaking_sessions_select_own" on public.live_speaking_sessions
  for select using (auth.uid() = user_id);
create policy "live_speaking_sessions_insert_own" on public.live_speaking_sessions
  for insert with check (auth.uid() = user_id);
create policy "live_speaking_sessions_update_own" on public.live_speaking_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "live_speaking_sessions_delete_own" on public.live_speaking_sessions
  for delete using (auth.uid() = user_id);

-- 2) Allow the new AI usage activity type.
alter table public.ai_usage_logs
  drop constraint if exists ai_usage_logs_activity_type_check;
alter table public.ai_usage_logs
  add constraint ai_usage_logs_activity_type_check check (
    activity_type in (
      'exercise_evaluation', 'writing_feedback', 'speaking_feedback',
      'plan_generation', 'error_journal_analysis', 'chat', 'lesson_generation', 'live_speaking'
    )
  );
