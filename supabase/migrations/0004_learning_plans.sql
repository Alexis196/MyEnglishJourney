create table public.learning_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  total_days integer not null default 90 check (total_days > 0),
  start_date date not null default current_date,
  target_level_start text check (target_level_start in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  target_level_end text check (target_level_end in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  generated_by text not null default 'template' check (generated_by in ('ai', 'manual', 'template')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index learning_plans_user_id_status_idx on public.learning_plans (user_id, status);

create trigger set_learning_plans_updated_at
  before update on public.learning_plans
  for each row execute function public.set_updated_at();

alter table public.learning_plans enable row level security;

create policy "learning_plans_select_own" on public.learning_plans for select using (auth.uid() = user_id);
create policy "learning_plans_insert_own" on public.learning_plans for insert with check (auth.uid() = user_id);
create policy "learning_plans_update_own" on public.learning_plans for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "learning_plans_delete_own" on public.learning_plans for delete using (auth.uid() = user_id);

alter table public.profiles
  add constraint profiles_current_plan_id_fkey foreign key (current_plan_id) references public.learning_plans(id) on delete set null;
