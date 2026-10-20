-- Vocabulary section. Additive: where a word came from, no duplicate words per student, and the AI activity type.

-- 1) Where each word was saved from (manual entry, pasted text, a lesson, the live conversation, speaking feedback).
alter table public.vocabulary
  add column if not exists source text not null default 'manual';
alter table public.vocabulary
  drop constraint if exists vocabulary_source_check;
alter table public.vocabulary
  add constraint vocabulary_source_check check (source in ('manual', 'text', 'lesson', 'live', 'speaking'));

-- 2) A student saves a word once, whatever its capitalisation.
create unique index if not exists vocabulary_user_term_unique
  on public.vocabulary (user_id, lower(term));

-- 3) Allow the new AI usage activity type.
alter table public.ai_usage_logs
  drop constraint if exists ai_usage_logs_activity_type_check;
alter table public.ai_usage_logs
  add constraint ai_usage_logs_activity_type_check check (
    activity_type in (
      'exercise_evaluation', 'writing_feedback', 'speaking_feedback',
      'plan_generation', 'error_journal_analysis', 'chat', 'lesson_generation', 'live_speaking', 'vocabulary'
    )
  );
