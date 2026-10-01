-- 0019: lesson engine — per-plan personalization, per-day generation state, themes, usage activity type.
-- Additive only: no column is dropped or rewritten, no row is deleted. Safe to run once on production.

-- 1) Structured personalization captured when the plan is created (profession is optional).
--    Shape: { profession?, interests[], otherInterests?, primaryGoal?, focusAreas[], minutesPerSession }.
--    NULL for plans created before this migration; the app then falls back to learning_goals + neutral defaults.
alter table public.learning_plans
  add column if not exists personalization jsonb;

-- 2) Per-day theme (previously discarded) and lesson-generation state machine.
alter table public.plan_days
  add column if not exists theme text,
  add column if not exists generation_status text not null default 'pending',
  add column if not exists generation_started_at timestamptz,
  add column if not exists generation_attempts integer not null default 0,
  add column if not exists generation_error text;

alter table public.plan_days
  drop constraint if exists plan_days_generation_status_check;
alter table public.plan_days
  add constraint plan_days_generation_status_check
  check (generation_status in ('pending', 'generating', 'ready', 'failed'));

alter table public.plan_days
  drop constraint if exists plan_days_generation_attempts_check;
alter table public.plan_days
  add constraint plan_days_generation_attempts_check check (generation_attempts >= 0);

-- Days that already have a lesson (day 1 of existing plans) are done: mark them ready.
update public.plan_days
   set generation_status = 'ready'
 where lesson_id is not null
   and generation_status <> 'ready';

-- Used to count "generations started in the last 24h" per user (LESSON_GENERATIONS_PER_DAY).
create index if not exists plan_days_user_generation_started_idx
  on public.plan_days (user_id, generation_started_at)
  where generation_started_at is not null;

-- 3) Allow the new AI usage activity type.
alter table public.ai_usage_logs
  drop constraint if exists ai_usage_logs_activity_type_check;
alter table public.ai_usage_logs
  add constraint ai_usage_logs_activity_type_check check (
    activity_type in (
      'exercise_evaluation', 'writing_feedback', 'speaking_feedback',
      'plan_generation', 'error_journal_analysis', 'chat', 'lesson_generation'
    )
  );

-- 4) Speaking Lab: remember when the student needed the Spanish translation of the question
--    (a hint for adapting difficulty later; never used to penalize).
alter table public.speaking_sessions
  add column if not exists used_translation boolean not null default false;
