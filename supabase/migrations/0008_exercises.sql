create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_section_id uuid not null references public.lesson_sections(id) on delete cascade,
  exercise_type text not null check (
    exercise_type in (
      'multiple_choice', 'fill_in_blank', 'word_ordering', 'translation_es_en', 'translation_en_es',
      'free_writing', 'reading_comprehension', 'listening_comprehension', 'sentence_construction',
      'grammar_error_correction'
    )
  ),
  order_index integer not null,
  -- Public-safe: prompt, options, blanks. The backend API never forwards answer_key to clients.
  content jsonb not null default '{}'::jsonb,
  -- Correct answer(s). Read server-side only, during attempt validation.
  -- NOTE (documented limitation, see docs/rls-verification.md): RLS here only enforces
  -- per-user row ownership, not per-column visibility — a user could in principle query
  -- Postgrest directly with their own JWT and read their own answer_key, bypassing the
  -- backend's stripping logic. Low severity (self-only, no cross-user exposure) and
  -- acceptable for Phase 1; a hardening option for later is revoking column-level SELECT
  -- on answer_key from the authenticated role and reading it server-side via the
  -- service-role client instead.
  answer_key jsonb not null default '{}'::jsonb,
  difficulty text,
  points integer not null default 10 check (points > 0),
  created_at timestamptz not null default now(),

  unique (lesson_section_id, order_index)
);

create index exercises_lesson_section_id_idx on public.exercises (lesson_section_id);

alter table public.exercises enable row level security;

create policy "exercises_select_own" on public.exercises for select using (auth.uid() = user_id);
create policy "exercises_insert_own" on public.exercises for insert with check (auth.uid() = user_id);
create policy "exercises_update_own" on public.exercises for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "exercises_delete_own" on public.exercises for delete using (auth.uid() = user_id);
