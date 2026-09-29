create table public.vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  term text not null,
  translation text not null,
  example_sentence text,
  category text,
  learning_status text not null default 'pending' check (learning_status in ('pending', 'learned', 'difficult')),
  source_lesson_id uuid references public.lessons(id) on delete set null,
  -- FK to error_journal added in 0013_error_journal.sql once that table exists.
  source_error_journal_id uuid,
  created_at timestamptz not null default now()
);

create index vocabulary_user_id_idx on public.vocabulary (user_id);

alter table public.vocabulary enable row level security;

create policy "vocabulary_select_own" on public.vocabulary for select using (auth.uid() = user_id);
create policy "vocabulary_insert_own" on public.vocabulary for insert with check (auth.uid() = user_id);
create policy "vocabulary_update_own" on public.vocabulary for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "vocabulary_delete_own" on public.vocabulary for delete using (auth.uid() = user_id);
