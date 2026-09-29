create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_day_id uuid not null unique references public.plan_days(id) on delete cascade,
  title text not null,
  objective text,
  cefr_level text check (cefr_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  current_section_index integer not null default 0,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index lessons_user_id_status_idx on public.lessons (user_id, status);

create trigger set_lessons_updated_at
  before update on public.lessons
  for each row execute function public.set_updated_at();

alter table public.plan_days
  add constraint plan_days_lesson_id_fkey foreign key (lesson_id) references public.lessons(id) on delete set null;

alter table public.lessons enable row level security;

create policy "lessons_select_own" on public.lessons for select using (auth.uid() = user_id);
create policy "lessons_insert_own" on public.lessons for insert with check (auth.uid() = user_id);
create policy "lessons_update_own" on public.lessons for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "lessons_delete_own" on public.lessons for delete using (auth.uid() = user_id);
