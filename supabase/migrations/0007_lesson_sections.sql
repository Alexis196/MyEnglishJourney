create table public.lesson_sections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  section_type text not null check (
    section_type in ('review', 'vocabulary', 'grammar', 'interactive', 'listening', 'speaking', 'final_assessment')
  ),
  order_index integer not null,
  title text not null,
  content jsonb not null default '{}'::jsonb,
  completed boolean not null default false,
  created_at timestamptz not null default now(),

  unique (lesson_id, order_index)
);

create index lesson_sections_lesson_id_idx on public.lesson_sections (lesson_id);

alter table public.lesson_sections enable row level security;

create policy "lesson_sections_select_own" on public.lesson_sections for select using (auth.uid() = user_id);
create policy "lesson_sections_insert_own" on public.lesson_sections for insert with check (auth.uid() = user_id);
create policy "lesson_sections_update_own" on public.lesson_sections for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "lesson_sections_delete_own" on public.lesson_sections for delete using (auth.uid() = user_id);
