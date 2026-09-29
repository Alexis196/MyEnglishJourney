create table public.learning_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_level text check (target_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  focus_areas text[] not null default '{}',
  daily_minutes_goal integer not null default 20 check (daily_minutes_goal > 0),
  motivation text,
  target_completion_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index learning_goals_user_id_idx on public.learning_goals (user_id);

create trigger set_learning_goals_updated_at
  before update on public.learning_goals
  for each row execute function public.set_updated_at();

alter table public.learning_goals enable row level security;

create policy "learning_goals_select_own" on public.learning_goals for select using (auth.uid() = user_id);
create policy "learning_goals_insert_own" on public.learning_goals for insert with check (auth.uid() = user_id);
create policy "learning_goals_update_own" on public.learning_goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "learning_goals_delete_own" on public.learning_goals for delete using (auth.uid() = user_id);
