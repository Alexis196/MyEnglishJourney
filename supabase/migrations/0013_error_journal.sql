create table public.error_journal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('exercise', 'speaking', 'writing')),
  -- Polymorphic reference (exercise_attempts.id or speaking_sessions.id) validated in the app layer, not a DB FK.
  source_id uuid,
  error_category text not null check (error_category in ('grammar', 'vocabulary', 'pronunciation', 'syntax', 'other')),
  original_text text not null,
  corrected_text text not null,
  explanation text not null,
  frequency_count integer not null default 1 check (frequency_count > 0),
  resolved boolean not null default false,
  resolved_at timestamptz,
  used_in_plan_regeneration boolean not null default false,
  created_at timestamptz not null default now()
);

create index error_journal_user_resolved_idx on public.error_journal (user_id, resolved);
create index error_journal_user_category_idx on public.error_journal (user_id, error_category);

alter table public.vocabulary
  add constraint vocabulary_source_error_journal_id_fkey
  foreign key (source_error_journal_id) references public.error_journal(id) on delete set null;

alter table public.error_journal enable row level security;

create policy "error_journal_select_own" on public.error_journal for select using (auth.uid() = user_id);
create policy "error_journal_insert_own" on public.error_journal for insert with check (auth.uid() = user_id);
create policy "error_journal_update_own" on public.error_journal for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "error_journal_delete_own" on public.error_journal for delete using (auth.uid() = user_id);
