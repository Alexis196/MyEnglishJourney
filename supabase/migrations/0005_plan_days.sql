-- Schedule spine for a learning plan. Not named explicitly in the original
-- spec (weeks -> days -> lessons) but needed so rest/review/assessment days
-- without lesson content, and "what day of the 90 is this", have a home.
create table public.plan_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  learning_plan_id uuid not null references public.learning_plans(id) on delete cascade,
  day_number integer not null check (day_number between 1 and 90),
  week_number integer generated always as (ceil(day_number / 7.0)::int) stored,
  day_type text not null default 'lesson' check (day_type in ('lesson', 'review', 'rest', 'assessment')),
  lesson_id uuid,
  status text not null default 'locked' check (status in ('locked', 'available', 'completed')),
  unlocked_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),

  unique (learning_plan_id, day_number)
);

create index plan_days_user_id_day_number_idx on public.plan_days (user_id, day_number);
create index plan_days_user_id_status_idx on public.plan_days (user_id, status);

alter table public.plan_days enable row level security;

create policy "plan_days_select_own" on public.plan_days for select using (auth.uid() = user_id);
create policy "plan_days_insert_own" on public.plan_days for insert with check (auth.uid() = user_id);
create policy "plan_days_update_own" on public.plan_days for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "plan_days_delete_own" on public.plan_days for delete using (auth.uid() = user_id);
