import type { ExerciseType } from "@myenglishjourney/shared";

/**
 * Session length drives the amount of PRACTICE the student does, not the amount of generated text: 60 minutes
 * means roughly 60 minutes of student interaction. The time model below is what the blueprint and the
 * validator both use, so they always agree.
 */
export const SESSION_TIERS = [30, 45, 60, 90] as const;
export type SessionTier = (typeof SESSION_TIERS)[number];

interface TierConfig {
  vocabulary: { min: number; max: number };
  /** Exercises dedicated to reviewing earlier material (lesson days with history or a warm-up). */
  review: number;
  /** Own-production tasks: short answers + main task. Every one is AI-evaluated, hence kept small. */
  production: { short: number; main: number };
}

export const TIER_CONFIG: Record<SessionTier, TierConfig> = {
  30: { vocabulary: { min: 4, max: 6 }, review: 3, production: { short: 1, main: 1 } },
  45: { vocabulary: { min: 6, max: 8 }, review: 4, production: { short: 1, main: 1 } },
  60: { vocabulary: { min: 8, max: 12 }, review: 5, production: { short: 2, main: 1 } },
  90: { vocabulary: { min: 12, max: 16 }, review: 7, production: { short: 2, main: 2 } },
};

/** Snap any configured minutes (10-240) to the closest supported tier. */
export function tierForMinutes(minutes: number): SessionTier {
  let best: SessionTier = SESSION_TIERS[0];
  for (const tier of SESSION_TIERS) {
    if (Math.abs(tier - minutes) < Math.abs(best - minutes)) best = tier;
  }
  return best;
}

/** Rough time a student needs per task, in seconds (reading + thinking + typing/tapping). */
export const EXERCISE_SECONDS: Record<string, number> = {
  multiple_choice: 45,
  fill_in_blank: 60,
  word_ordering: 90,
  grammar_error_correction: 90,
  translation_es_en: 100,
  translation_en_es: 100,
};
/** Average of the non-production exercises, used to turn a time budget into an exercise count. */
export const AVG_PRACTICE_SECONDS = 75;
export const VOCAB_ITEM_SECONDS = 30;
export const EXPLANATION_SECONDS = 60;
export const PATTERN_SECONDS = 30;

/** Writing takes a fixed warm-up plus time per requested word. */
export function productionSeconds(minWords: number | undefined): number {
  return 45 + 8 * (minWords ?? 10);
}

export interface EstimableLesson {
  sections: Array<{
    explanation?: string | undefined;
    pattern?: unknown;
    vocabulary?: unknown[] | undefined;
    exercises?: Array<{ exerciseType: ExerciseType | string; minWords?: number | undefined }> | undefined;
  }>;
}

export function estimateLessonMinutes(lesson: EstimableLesson): number {
  let seconds = 0;
  for (const section of lesson.sections) {
    if (section.explanation) seconds += EXPLANATION_SECONDS;
    if (section.pattern) seconds += PATTERN_SECONDS;
    seconds += (section.vocabulary?.length ?? 0) * VOCAB_ITEM_SECONDS;
    for (const exercise of section.exercises ?? []) {
      seconds +=
        exercise.exerciseType === "free_writing"
          ? productionSeconds(exercise.minWords)
          : (EXERCISE_SECONDS[exercise.exerciseType] ?? AVG_PRACTICE_SECONDS);
    }
  }
  return Math.round(seconds / 60);
}

/** Accepted band for the estimated time relative to the target. */
export const DURATION_TOLERANCE = { min: 0.55, max: 1.5 } as const;
