/**
 * Hand-written row types mirroring the SQL migrations in supabase/migrations.
 * These are intentionally minimal (used for repository return types on the
 * backend). Once a real Supabase project exists, this file can be replaced
 * wholesale with `supabase gen types typescript` output without touching
 * the Zod schemas in ./schemas, which are the actual API/runtime contract.
 */

export interface ProfileRow {
  id: string;
  full_name: string | null;
  current_level: string | null;
  explanation_language: "es" | "en";
  theme_preference: "light" | "dark" | "system";
  timezone: string | null;
  onboarding_completed: boolean;
  current_plan_id: string | null;
  streak_count: number;
  longest_streak: number;
  last_activity_date: string | null;
  updated_at: string;
}

export interface LearningPlanRow {
  id: string;
  user_id: string;
  title: string;
  status: "active" | "completed" | "archived";
  total_days: number;
  start_date: string;
  target_level_start: string | null;
  target_level_end: string | null;
  generated_by: "ai" | "manual" | "template";
  updated_at: string;
}

export interface PlanDayRow {
  id: string;
  user_id: string;
  learning_plan_id: string;
  day_number: number;
  week_number: number;
  day_type: "lesson" | "review" | "rest" | "assessment";
  lesson_id: string | null;
  status: "locked" | "available" | "completed";
  unlocked_at: string | null;
  completed_at: string | null;
}

export interface LessonRow {
  id: string;
  user_id: string;
  plan_day_id: string;
  title: string;
  objective: string | null;
  cefr_level: string | null;
  current_section_index: number;
  status: "not_started" | "in_progress" | "completed";
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

export interface LessonSectionRow {
  id: string;
  user_id: string;
  lesson_id: string;
  section_type: string;
  order_index: number;
  title: string;
  content: Record<string, unknown>;
  completed: boolean;
}

export interface ExerciseRow {
  id: string;
  user_id: string;
  lesson_section_id: string;
  exercise_type: string;
  order_index: number;
  content: Record<string, unknown>;
  answer_key: Record<string, unknown>;
  difficulty: string | null;
  points: number;
}

export interface ExerciseAttemptRow {
  id: string;
  user_id: string;
  exercise_id: string;
  attempt_number: number;
  response: Record<string, unknown>;
  is_correct: boolean | null;
  score: number | null;
  ai_feedback: Record<string, unknown> | null;
  evaluation_status: string;
  submitted_at: string;
}

export interface AiUsageLogRow {
  id: string;
  user_id: string;
  provider: "gemini" | "openai";
  model: string;
  activity_type: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  latency_ms: number;
  status: "success" | "error" | "fallback";
  error_code: string | null;
  created_at: string;
}

export interface UserAiSettingsRow {
  user_id: string;
  provider_mode: "auto" | "gemini_only" | "openai_only";
  monthly_budget_usd: number;
  hard_block_at_budget: boolean;
  notify_at_percent: number;
  updated_at: string;
}

export interface StudySessionRow {
  id: string;
  user_id: string;
  activity_type: string;
  lesson_id: string | null;
  plan_day_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
}

export interface ErrorJournalRow {
  id: string;
  user_id: string;
  source_type: "exercise" | "speaking" | "writing";
  source_id: string | null;
  error_category: "grammar" | "vocabulary" | "pronunciation" | "syntax" | "other";
  original_text: string;
  corrected_text: string;
  explanation: string;
  frequency_count: number;
  resolved: boolean;
  resolved_at: string | null;
  used_in_plan_regeneration: boolean;
  created_at: string;
}
